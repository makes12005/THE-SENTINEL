const path = require('path');
const postgres = require('postgres');
const fs = require('fs');

require('dotenv').config({ path: '.env.production' });

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'src/db/migrations/0003_silent_marvel_apes.sql'), 'utf8');
  console.log('Connecting to:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
  
  const client = postgres(process.env.DATABASE_URL, { ssl: true });
  
  try {
    await client.unsafe(sql);
    console.log('✓ Migration 0003_silent_marvel_apes applied successfully');
  } catch(e) {
    console.error('✗ Migration failed:');
    console.error(e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
