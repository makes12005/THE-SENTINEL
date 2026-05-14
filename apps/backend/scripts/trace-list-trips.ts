
import 'dotenv/config';
import { db } from '../src/db';
import { trips, routes, users, buses, tripPassengers } from '../src/db/schema';
import { eq, and, or, sql, desc } from 'drizzle-orm';

async function debugListTrips() {
  const userId = '866644db-5599-4aab-bda8-356cac5af777';
  
  // 1. Get user details
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    console.error('User not found');
    return;
  }
  console.log('User:', { id: user.id, name: user.name, role: user.role, agency_id: user.agency_id });

  const agencyId = user.agency_id;
  if (!agencyId) {
    console.error('User has no agency_id');
    return;
  }

  // 2. Check trips where this user is driver or conductor
  const myTrips = await db.select().from(trips).where(
    or(eq(trips.driver_id, userId), eq(trips.conductor_id, userId))
  );
  console.log(`Total trips where user is driver/conductor: ${myTrips.length}`);
  myTrips.forEach(t => console.log(`- Trip ID: ${t.id}, Status: ${t.status}, Driver: ${t.driver_id}, Conductor: ${t.conductor_id}, Route: ${t.route_id}, Owner: ${t.owned_by_operator_id}`));

  // 3. Try to run the exact logic from listTrips
  const conditions = [
    eq(routes.agency_id, agencyId),
    eq(trips.status, 'scheduled'), // common filter from mobile
  ];

  if (user.role === 'driver') {
    conditions.push(or(eq(trips.driver_id, userId), eq(trips.conductor_id, userId)) as any);
  }

  console.log('\nRunning listTrips-style query...');
  
  const results = await db
    .select({
      tripId: trips.id,
      routeName: routes.name,
      routeAgencyId: routes.agency_id,
      conductorId: trips.conductor_id,
      ownerId: trips.owned_by_operator_id,
      busId: trips.bus_id
    })
    .from(trips)
    .innerJoin(routes, eq(routes.id, trips.route_id))
    .innerJoin(sql`users conductor`, sql`conductor.id = ${trips.conductor_id}`)
    .innerJoin(sql`users owner_user`, sql`owner_user.id = ${trips.owned_by_operator_id}`)
    .where(and(...conditions));

  console.log(`Results found: ${results.length}`);
  results.forEach(r => console.log(JSON.stringify(r)));

  if (results.length === 0 && myTrips.length > 0) {
    console.log('\nINVESTIGATION: Why were rows dropped?');
    for (const t of myTrips) {
      if (t.status !== 'scheduled') {
        console.log(`- Trip ${t.id} dropped because status is ${t.status} (expected scheduled)`);
        continue;
      }
      
      const [r] = await db.select().from(routes).where(eq(routes.id, t.route_id)).limit(1);
      if (!r) {
        console.log(`- Trip ${t.id} dropped because route ${t.route_id} is missing`);
      } else if (r.agency_id !== agencyId) {
        console.log(`- Trip ${t.id} dropped because route agency ${r.agency_id} != user agency ${agencyId}`);
      }

      const [c] = await db.select().from(users).where(eq(users.id, t.conductor_id)).limit(1);
      if (!c) {
        console.log(`- Trip ${t.id} dropped because conductor ${t.conductor_id} is missing from users table`);
      }

      const [o] = await db.select().from(users).where(eq(users.id, t.owned_by_operator_id)).limit(1);
      if (!o) {
        console.log(`- Trip ${t.id} dropped because owner ${t.owned_by_operator_id} is missing from users table`);
      }
    }
  }
}

debugListTrips().catch(console.error).finally(() => process.exit());
