import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('No DATABASE_URL'); process.exit(1); }

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

async function main() {
  const users = await sql`SELECT id, name, phone, role, is_active, created_at FROM users ORDER BY created_at`;
  console.log('\n=== USERS ===');
  users.forEach(u => console.log(`  [${u.role}] ${u.name} | ${u.phone} | active:${u.is_active} | id:${u.id}`));

  const agencies = await sql`SELECT id, name, owner_id FROM agencies`;
  console.log('\n=== AGENCIES ===', agencies.length);
  agencies.forEach(a => console.log(`  ${a.name} | owner:${a.owner_id} | id:${a.id}`));

  const routes = await sql`SELECT COUNT(*)::int as c FROM routes`;
  console.log('\n=== ROUTES count:', routes[0].c);

  const buses = await sql`SELECT COUNT(*)::int as c FROM buses`;
  console.log('=== BUSES count:', buses[0].c);

  const trips = await sql`SELECT COUNT(*)::int as c FROM trips`;
  console.log('=== TRIPS count:', trips[0].c);

  const passengers = await sql`SELECT COUNT(*)::int as c FROM trip_passengers`;
  console.log('=== TRIP_PASSENGERS count:', passengers[0].c);

  const stops = await sql`SELECT COUNT(*)::int as c FROM stops`;
  console.log('=== STOPS count:', stops[0].c);

  const wallets = await sql`SELECT COUNT(*)::int as c FROM agency_wallets`;
  console.log('=== AGENCY_WALLETS count:', wallets[0].c);

  const wtx = await sql`SELECT COUNT(*)::int as c FROM wallet_transactions`;
  console.log('=== WALLET_TRANSACTIONS count:', wtx[0].c);

  const alerts = await sql`SELECT COUNT(*)::int as c FROM alert_logs`;
  console.log('=== ALERT_LOGS count:', alerts[0].c);

  const invites = await sql`SELECT COUNT(*)::int as c FROM agency_invites`;
  console.log('=== AGENCY_INVITES count:', invites[0].c);

  await sql.end();
  process.exit(0);
}

main().catch(e => { console.error(e); sql.end().finally(() => process.exit(1)); });
