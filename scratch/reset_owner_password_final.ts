
import { loadEnv } from '../apps/backend/src/lib/load-env';
loadEnv();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { users } from '../apps/backend/src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString);
const db = drizzle(sql);

async function resetPassword() {
  const hashedPassword = await bcrypt.hash('123123123', 10);
  const phone = '+919825247228';
  
  await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.phone, phone));
  
  console.log('Password reset for +919825247228 to 123123123');
  process.exit(0);
}

resetPassword().catch(err => {
  console.error(err);
  process.exit(1);
});
