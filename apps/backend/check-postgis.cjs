const postgres = require('postgres');
async function run() {
  const sql = postgres('postgresql://neondb_owner:npg_yxAdsK94wclz@ep-late-mouse-ancgm810-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');
  try {
    const res = await sql`SELECT PostGIS_version()`;
    console.log(res);
  } catch (err) {
    console.error(err.message);
  } finally {
    await sql.end();
  }
}
run();
