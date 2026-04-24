import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

async function main() {
  const envPath = path.resolve('apps/backend/.env.production');
  dotenv.config({ path: envPath });

  const sql = postgres(process.env.DATABASE_URL!);

  try {
    console.log('Adding invite_code column to agencies table...');
    await sql`ALTER TABLE agencies ADD COLUMN IF NOT EXISTS invite_code varchar(20) UNIQUE`;
    console.log('Column added successfully.');

    console.log('Seeding test agency...');
    const [agency] = await sql`
      INSERT INTO agencies (name, phone, email, state, invite_code)
      VALUES ('Test Agency', '+919999999999', 'agency@test.com', 'Gujarat', 'TEST123')
      ON CONFLICT (invite_code) DO UPDATE SET name = 'Test Agency'
      RETURNING *
    `;
    console.log('Agency seeded:', agency);
  } catch (err) {
    console.error('Failed to add column:', err);
  } finally {
    await sql.end();
  }
}

main();
