const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_yxAdsK94wclz@ep-late-mouse-ancgm810-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('--- OWNER CHECK ---');
  const ownerRes = await client.query("SELECT id, name, phone, role, agency_id FROM users WHERE phone = '+919825247228'");
  console.log('Owner Record:', ownerRes.rows[0]);

  if (ownerRes.rows[0]) {
    const agencyId = ownerRes.rows[0].agency_id;
    console.log(`Agency ID: ${agencyId}`);

    console.log('\n--- OPERATORS FOR THIS AGENCY ---');
    const opsRes = await client.query("SELECT id, name, phone, role, agency_id, is_active FROM users WHERE agency_id = $1 AND role = 'Operator'", [agencyId]);
    console.log(`Found ${opsRes.rows.length} operators:`);
    console.table(opsRes.rows);

    console.log('\n--- ALL OPERATORS IN SYSTEM ---');
    const allOpsRes = await client.query("SELECT id, name, phone, role, agency_id, is_active FROM users WHERE role = 'Operator'");
    console.log(`Found ${allOpsRes.rows.length} total operators in system:`);
    console.table(allOpsRes.rows);
  } else {
    console.log('Owner not found!');
  }

  await client.end();
}

run().catch(console.error);
