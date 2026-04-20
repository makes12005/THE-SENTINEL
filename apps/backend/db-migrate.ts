import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';

async function run() {
  const connectionString = "postgresql://neondb_owner:npg_yxAdsK94wclz@ep-late-mouse-ancgm810.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);
  
  console.log('Running migrations...');
  try {
    await migrate(db, { migrationsFolder: path.join(__dirname, 'src/db/migrations') });
    console.log('Migrations applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}

run();
