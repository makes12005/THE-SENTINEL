const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const phones = ['+919876543001', '+919876543002', '+919876543003'];

  const before = await client.query(
    'SELECT id, name, phone, role, agency_id FROM users WHERE phone = ANY($1) ORDER BY phone',
    [phones]
  );

  const agencies = await client.query('SELECT id, name FROM agencies ORDER BY created_at ASC LIMIT 5');
  let agencyId = agencies.rows[0]?.id ?? null;
  let createdAgency = null;

  if (!agencyId) {
    const inserted = await client.query(
      'INSERT INTO agencies (name, phone, email, state, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name',
      ['Test Agency Gujarat', '+919999999998', 'test@testagency.in', 'Gujarat']
    );
    createdAgency = inserted.rows[0];
    agencyId = createdAgency.id;
  }

  const updated = await client.query('UPDATE users SET agency_id = $1 WHERE phone = ANY($2)', [agencyId, phones]);

  const after = await client.query(
    'SELECT id, name, phone, role, agency_id FROM users WHERE phone = ANY($1) ORDER BY phone',
    [phones]
  );

  const staff = await client.query(
    'SELECT id, name, phone, role FROM users WHERE phone IN ($1, $2) ORDER BY phone',
    ['+919876543002', '+919876543003']
  );

  await client.end();

  console.log(
    JSON.stringify(
      {
        before: before.rows,
        agencies: agencies.rows,
        createdAgency,
        selectedAgencyId: agencyId,
        updatedRows: updated.rowCount,
        after: after.rows,
        staff: staff.rows,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
