
import { db } from './apps/backend/src/db/index';
import { agencies, users, trips, tripWallets } from './apps/backend/src/db/schema';
import { count, eq, and } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/backend/.env' });

async function checkHealth() {
  const allAgencies = await db.select().from(agencies);
  console.log('Total Agencies:', allAgencies.length);

  for (const agency of allAgencies) {
    const [activeTrips] = await db
      .select({ cnt: count() })
      .from(trips)
      .innerJoin(users, eq(trips.owned_by_operator_id, users.id))
      .where(and(
        eq(users.agency_id, agency.id),
        eq(trips.status, 'active')
      ));
    
    console.log(`Agency: ${agency.name}, Active Trips: ${activeTrips.cnt}`);
  }
}

checkHealth().catch(console.error);
