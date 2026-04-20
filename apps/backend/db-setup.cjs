const postgres = require('postgres');

async function main() {
  const sql = postgres('postgresql://neondb_owner:npg_yxAdsK94wclz@ep-late-mouse-ancgm810-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');
  
  try {
    console.log('Connecting to database to enable postgis...');
    await sql`CREATE EXTENSION IF NOT EXISTS postgis`;
    console.log('PostGIS extension enabled successfully.');
  } catch (err) {
    console.error('Failed to enable PostGIS:', err);
  } finally {
    await sql.end();
  }
}

main();
