import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as path from 'path';
import { loadEnv } from '../lib/load-env';

loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

async function main() {
  console.log('⏳ Running migrations...');
  
  await migrate(db, { 
    migrationsFolder: path.join(__dirname, 'migrations') 
  });

  console.log('✅ Migrations completed!');
  
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration failed!');
  console.error(err);
  process.exit(1);
});
