import { loadEnv } from './src/lib/load-env';
import postgres from 'postgres';

loadEnv();

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  try {
    const cols = await sql`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = '__drizzle_migrations'
    `;
    console.log('__drizzle_migrations columns:', cols);

    const data = await sql`SELECT * FROM __drizzle_migrations`;
    console.log('__drizzle_migrations data:', data);

    const agency_cols = await sql`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'agencies'
    `;
    console.log('agencies columns:', agency_cols);

  } catch (e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}

run();
