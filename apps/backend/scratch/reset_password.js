const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '.env.production') });

const sql = postgres(process.env.DATABASE_URL);

async function resetPassword() {
  try {
    const passwordHash = await bcrypt.hash('password123', 12);
    const result = await sql`
      UPDATE users 
      SET password_hash = ${passwordHash} 
      WHERE phone = '+919876543210'
      RETURNING id, name, phone
    `;
    console.log('Password reset successful for:', result);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

resetPassword();
