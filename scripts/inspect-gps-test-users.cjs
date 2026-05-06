const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const rows = await client.query(
    `SELECT id, name, phone, role, agency_id, is_active, created_at
     FROM users
     WHERE phone IN ($1, $2, $3)
     ORDER BY phone, created_at`,
    ['+919876543001', '+919876543002', '+919876543003']
  );

  const agencies = await client.query('SELECT id, name, created_at FROM agencies ORDER BY created_at ASC LIMIT 10');
  await client.end();

  console.log(JSON.stringify({ users: rows.rows, agencies: agencies.rows }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
