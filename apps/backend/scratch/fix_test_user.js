const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '.env.production') });

const sql = postgres(process.env.DATABASE_URL);

async function fixUser() {
  try {
    const password = 'Test@1234';
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await sql`
      UPDATE users 
      SET password_hash = ${passwordHash}, is_active = true, role = 'driver'
      WHERE phone = '+919876543210'
      RETURNING id, name, phone, role
    `;
    console.log('User fixed successfully:', result);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

fixUser();
