import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  console.log('--- USERS ---');
  const allUsers = await db.select().from(schema.users);
  console.table(allUsers.map(u => ({
    id: u.id,
    name: u.name,
    role: u.role,
    agency_id: u.agency_id
  })));

  console.log('\n--- TRIPS ---');
  const allTrips = await db.select({
    id: schema.trips.id,
    status: schema.trips.status,
    conductor_id: schema.trips.conductor_id,
    driver_id: schema.trips.driver_id,
    operator_id: schema.trips.owned_by_operator_id,
    scheduled_date: schema.trips.scheduled_date,
    scheduled_time: schema.trips.scheduled_time,
    route_id: schema.trips.route_id,
    route_agency_id: schema.routes.agency_id,
    route_name: schema.routes.name
  }).from(schema.trips)
    .innerJoin(schema.routes, eq(schema.routes.id, schema.trips.route_id));

  console.table(allTrips);

  await pool.end();
}

main().catch(console.error);
