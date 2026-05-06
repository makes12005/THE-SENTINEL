
import { db } from '../db';
import { agencies, users, trips } from '../db/schema';
import { count, eq, and } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

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

checkHealth().catch(console.error).finally(() => process.exit(0));
