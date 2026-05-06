const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.production') });

const sql = postgres(process.env.DATABASE_URL);

async function checkAdmin() {
  try {
    const users = await sql`SELECT id, name, email, phone, role, is_active FROM users WHERE phone = '+917778069828' OR phone = '7778069828'`;
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

checkAdmin();
