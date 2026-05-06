const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const operatorPhone = '+919876543001';
  const conductorPhone = '+919876543002';
  const driverPhone = '+919876543003';

  const targetAgency = await client.query('SELECT id, name FROM agencies ORDER BY created_at ASC LIMIT 1');
  if (!targetAgency.rows[0]) {
    throw new Error('No agency found to assign test users.');
  }
  const agencyId = targetAgency.rows[0].id;

  const conductors = await client.query(
    `SELECT id, phone, created_at
     FROM users
     WHERE phone = $1 AND role = 'conductor'
     ORDER BY created_at ASC`,
    [conductorPhone]
  );

  let keptConductorId = null;
  if (conductors.rows.length > 0) {
    keptConductorId = conductors.rows[0].id;
    for (let i = 1; i < conductors.rows.length; i += 1) {
      const dup = conductors.rows[i];
      await client.query(
        'UPDATE users SET phone = $1, is_active = false WHERE id = $2',
        [`+91987654${String(Date.now() + i).slice(-4)}`, dup.id]
      );
    }
  }

  await client.query('UPDATE users SET agency_id = $1 WHERE phone = $2', [agencyId, operatorPhone]);
  await client.query('UPDATE users SET agency_id = $1 WHERE id = $2', [agencyId, keptConductorId]);
  await client.query('UPDATE users SET agency_id = $1 WHERE phone = $2', [agencyId, driverPhone]);

  const verify = await client.query(
    `SELECT id, name, phone, role, agency_id, is_active
     FROM users
     WHERE phone IN ($1, $2, $3)
     ORDER BY phone`,
    [operatorPhone, conductorPhone, driverPhone]
  );

  await client.end();
  console.log(
    JSON.stringify(
      {
        selectedAgencyId: agencyId,
        keptConductorId,
        users: verify.rows,
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
