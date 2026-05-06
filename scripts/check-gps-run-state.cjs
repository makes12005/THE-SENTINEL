const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const trips = await client.query(
    `SELECT id, status, conductor_id, driver_id, created_at, started_at, completed_at
     FROM trips
     WHERE conductor_id IN (
       SELECT id FROM users WHERE phone = '+919876543002'
     )
     ORDER BY created_at DESC
     LIMIT 5`
  );

  const alertLogCounts = await client.query(
    `SELECT tp.trip_id, COUNT(al.id)::int AS logs_count
     FROM trip_passengers tp
     LEFT JOIN alert_logs al ON al.trip_passenger_id = tp.id
     WHERE tp.trip_id = ANY($1)
     GROUP BY tp.trip_id`,
    [trips.rows.map((t) => t.id)]
  );

  await client.end();
  console.log(JSON.stringify({ trips: trips.rows, alertLogCounts: alertLogCounts.rows }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
