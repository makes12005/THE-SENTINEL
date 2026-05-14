const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.production') });

const sql = postgres(process.env.DATABASE_URL);

async function listUsers() {
  try {
    const users = await sql`SELECT id, phone, role, name, is_active FROM users WHERE role = 'driver' LIMIT 20`;
    console.table(users);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

listUsers();
