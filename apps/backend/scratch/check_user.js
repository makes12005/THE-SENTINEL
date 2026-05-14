const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.production') });

const sql = postgres(process.env.DATABASE_URL);

async function checkUser() {
  try {
    const users = await sql`
      SELECT id, name, phone, role, is_active 
      FROM users 
      WHERE phone = '+919876543210' OR email = 'test@example.com'
    `;
    console.log('Users found:', users);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

checkUser();
