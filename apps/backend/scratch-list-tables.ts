import { loadEnv } from './src/lib/load-env';
import postgres from 'postgres';

loadEnv();

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  try {
    const tables = await sql`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    `;
    console.log('Tables:', tables);

  } catch (e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}

run();
