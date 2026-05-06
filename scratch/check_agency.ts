import { db } from './apps/backend/src/db';
import { agencies } from './apps/backend/src/db/schema';
import { eq } from 'drizzle-orm';

async function check() {
  const id = 'f16399da-a9dd-4a6a-aa11-c775341b194f';
  console.log('Checking for agency ID:', id);
  const rows = await db.select().from(agencies).where(eq(agencies.id, id));
  console.log('Found rows:', rows.length);
  if (rows.length > 0) {
    console.log('Agency name:', rows[0].name);
  }
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
