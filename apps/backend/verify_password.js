const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env.production') });

const sql = postgres(process.env.DATABASE_URL);

async function verifyPassword() {
  try {
    const [user] = await sql`SELECT password_hash FROM users WHERE phone = '+917778069828'`;
    if (!user) {
      console.log('User not found');
      return;
    }
    console.log('Hash in DB:', user.password_hash);
    const isValid = await bcrypt.compare('Maahek$1210', user.password_hash);
    console.log('Is valid:', isValid);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

verifyPassword();
