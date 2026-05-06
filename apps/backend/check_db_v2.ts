import { db } from './src/db';
import { agencies, trips } from './src/db/schema';
import { count } from 'drizzle-orm';

async function check() {
  try {
    const [agencyCount] = await db.select({ cnt: count() }).from(agencies);
    const [tripCount] = await db.select({ cnt: count() }).from(trips);
    console.log('Agencies:', agencyCount.cnt);
    console.log('Trips:', tripCount.cnt);
    
    const allAgencies = await db.select().from(agencies).limit(10);
    console.log('Agencies Sample:', allAgencies);
  } catch (e) {
    console.error(e);
  }
}

check();
