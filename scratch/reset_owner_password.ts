
import { db, sql } from '../apps/backend/src/db/index';
import bcrypt from 'bcryptjs';

async function resetPassword() {
  const hashedPassword = await bcrypt.hash('123123123', 10);
  const phone = '+919825247228';
  
  // Using raw SQL to avoid any Drizzle version issues or schema mismatches in this scratch script
  await db.execute(sql`UPDATE users SET password = ${hashedPassword} WHERE phone = ${phone}`);
  
  console.log('Password reset for +919825247228 to 123123123');
  process.exit(0);
}

resetPassword().catch(err => {
  console.error(err);
  process.exit(1);
});
