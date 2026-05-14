import { db } from '../src/db';
import { trips, routes, users } from '../src/db/schema';
import { eq, or, and } from 'drizzle-orm';

async function main() {
  const driverId = '866644db-5599-4aab-bda8-356cac5af777';
  
  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        agency_id: users.agency_id,
      })
      .from(users)
      .where(eq(users.id, driverId))
      .limit(1);

    if (!user) {
      console.log('User not found!');
      return;
    }

    console.log('\nUser Details:');
    console.log('ID:', user.id);
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('User Agency ID:', user.agency_id);

    const result = await db
      .select({
        tripId: trips.id,
        driverId: trips.driver_id,
        conductorId: trips.conductor_id,
        ownerId: trips.owned_by_operator_id,
        routeId: trips.route_id,
        routeAgencyId: routes.agency_id,
        status: trips.status,
      })
      .from(trips)
      .innerJoin(routes, eq(routes.id, trips.route_id))
      .where(or(eq(trips.driver_id, driverId), eq(trips.conductor_id, driverId)));

    console.log('\nFound Trips:', result.length);
    for (let i = 0; i < result.length; i++) {
      const r = result[i];
      console.log(`${i + 1}. Trip: ${r.tripId}, Status: ${r.status}`);
      console.log(`   Driver: ${r.driverId}, Conductor: ${r.conductorId}, Owner: ${r.ownerId}`);
      
      const [conductor] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, r.conductorId!)).limit(1);
      const [owner] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, r.ownerId!)).limit(1);
      
      if (!conductor) console.log('   MISSING: Conductor user record not found in database!');
      else console.log(`   Conductor found: ${conductor.name}`);
      
      if (!owner) console.log('   MISSING: Owner user record not found in database!');
      else console.log(`   Owner found: ${owner.name}`);
      
      if (r.routeAgencyId !== user.agency_id) {
        console.log(`   WARNING: Route Agency ID (${r.routeAgencyId}) mismatch with User Agency ID (${user.agency_id})!`);
      }
    }

    if (result.length > 0) {
      const filtered = result.filter(r => r.routeAgencyId === user.agency_id && r.status === 'scheduled');
      console.log('\nTrips that SHOULD show up (status: scheduled, agency match):', filtered.length);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

main();
