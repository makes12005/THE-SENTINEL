
import { db } from './src/db';
import { agencies, trips } from './src/db/schema';
import { count } from 'drizzle-orm';

async function check() {
  const [agencyCount] = await db.select({ cnt: count() }).from(agencies);
  const [tripCount] = await db.select({ cnt: count() }).from(trips);
  
  console.log(`Agencies: ${agencyCount.cnt}`);
  console.log(`Trips: ${tripCount.cnt}`);
  
  const allAgencies = await db.select().from(agencies);
  console.log('Agencies List:', JSON.stringify(allAgencies, null, 2));
  
  process.exit(0);
}

check();
