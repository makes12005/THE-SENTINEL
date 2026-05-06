
import { loadEnv } from '../apps/backend/src/lib/load-env';
loadEnv();

import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString);

async function resetPassword() {
  const hashedPassword = await bcrypt.hash('123123123', 10);
  const phone = '+919825247228';
  
  // Use raw postgres driver query
  await sql`UPDATE "users" SET "password" = ${hashedPassword} WHERE "phone" = ${phone}`;
  
  console.log('Password reset for +919825247228 to 123123123');
  process.exit(0);
}

resetPassword().catch(err => {
  console.error(err);
  process.exit(1);
});
