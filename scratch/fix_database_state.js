const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_yxAdsK94wclz@ep-late-mouse-ancgm810-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('--- START FIX ---');

  // 1. Create Agency if not exists
  let agencyId;
  const agencyRes = await client.query("SELECT id FROM agencies WHERE name = 'Sentinel Logistics'");
  if (agencyRes.rows.length > 0) {
    agencyId = agencyRes.rows[0].id;
    console.log(`Found existing agency: ${agencyId}`);
  } else {
    const insertAgency = await client.query("INSERT INTO agencies (name, phone, email, state) VALUES ('Sentinel Logistics', '+919999999999', 'agency@sentinel.com', 'Gujarat') RETURNING id");
    agencyId = insertAgency.rows[0].id;
    console.log(`Created new agency: ${agencyId}`);
  }

  // 2. Link Owner
  const updateOwner = await client.query("UPDATE users SET agency_id = $1 WHERE phone = '+919825247228' RETURNING name", [agencyId]);
  if (updateOwner.rows.length > 0) {
    console.log(`Linked Owner ${updateOwner.rows[0].name} to Agency`);
  }

  // 3. Link Operators and Fix Names
  await client.query("UPDATE users SET agency_id = $1, name = 'Operator Alpha' WHERE phone = '+919000000001'", [agencyId]);
  await client.query("UPDATE users SET agency_id = $1, name = 'Operator Beta' WHERE phone = '+919000000002'", [agencyId]);
  console.log('Linked and fixed operators');

  console.log('--- FIX COMPLETE ---');

  await client.end();
}

run().catch(console.error);
