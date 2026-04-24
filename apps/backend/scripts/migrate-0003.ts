import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });

async function run() {
  console.log('Running migration 0003…');
  await sql`ALTER TABLE users ALTER COLUMN phone DROP NOT NULL`;
  console.log('✓ phone is now nullable');
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (email) WHERE email IS NOT NULL`;
  console.log('✓ partial unique index on email created');
  await sql.end();
  console.log('Migration 0003 complete');
}

run().catch((e) => {
  console.error('Migration failed:', e?.message ?? e);
  if (e?.detail) console.error('Detail:', e.detail);
  if (e?.hint)   console.error('Hint:', e.hint);
  process.exit(1);
});
