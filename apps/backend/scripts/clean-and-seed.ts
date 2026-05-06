/**
 * clean-and-seed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Deletes ALL rows from every table (FK-safe order, leaf-first)
 * 2. Inserts ONE admin user:
 *      Name     : Mahek
 *      Phone    : +917778069828  (E.164)
 *      Password : Mahek@1210
 *
 * Run:
 *   npx dotenv -e .env.local -- tsx scripts/clean-and-seed.ts
 *   (or)  DATABASE_URL=<url> npx tsx scripts/clean-and-seed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import bcrypt from 'bcryptjs';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('\n❌  DATABASE_URL environment variable is not set.\n');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SENTINEL DATABASE CLEAN + SEED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Step 1: Delete all data in FK-safe leaf-first order ───────────────────
  console.log('🔴  Clearing all tables...\n');

  await sql`DELETE FROM alert_logs`;
  console.log('  ✓  alert_logs');

  await sql`DELETE FROM conductor_locations`;
  console.log('  ✓  conductor_locations');

  await sql`DELETE FROM trip_passengers`;
  console.log('  ✓  trip_passengers');

  await sql`DELETE FROM trips`;
  console.log('  ✓  trips');

  await sql`DELETE FROM wallet_transactions`;
  console.log('  ✓  wallet_transactions');

  await sql`DELETE FROM agency_wallets`;
  console.log('  ✓  agency_wallets');

  await sql`DELETE FROM stops`;
  console.log('  ✓  stops');

  await sql`DELETE FROM routes`;
  console.log('  ✓  routes');

  await sql`DELETE FROM buses`;
  console.log('  ✓  buses');

  await sql`DELETE FROM refresh_tokens`;
  console.log('  ✓  refresh_tokens');

  await sql`DELETE FROM audit_logs`;
  console.log('  ✓  audit_logs');

  await sql`DELETE FROM users`;
  console.log('  ✓  users');

  // agencies references agency_invites — must delete agencies first
  await sql`DELETE FROM agencies`;
  console.log('  ✓  agencies');

  await sql`DELETE FROM agency_invites`;
  console.log('  ✓  agency_invites');

  console.log('\n✅  All tables cleared.\n');

  // ── Step 2: Seed the single admin user ────────────────────────────────────
  console.log('🟢  Creating admin user...\n');

  const passwordHash = await bcrypt.hash('Mahek@1210', 12);

  const [admin] = await sql`
    INSERT INTO users (name, phone, password_hash, role, is_active)
    VALUES (
      'Mahek',
      '+917778069828',
      ${passwordHash},
      'admin',
      true
    )
    RETURNING id, name, phone, role
  `;

  console.log('  Admin user created successfully:');
  console.log(`  ┌────────────────────────────────────────────────┐`);
  console.log(`  │  ID    : ${admin.id}`);
  console.log(`  │  Name  : ${admin.name}`);
  console.log(`  │  Phone : ${admin.phone}`);
  console.log(`  │  Role  : ${admin.role}`);
  console.log(`  └────────────────────────────────────────────────┘`);
  console.log('\n  Login credentials:');
  console.log('    Phone    → 7778069828  (or +917778069828)');
  console.log('    Password → Mahek@1210');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅  DONE — Database is clean and ready.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌  Script failed:', err.message ?? err);
  sql.end().finally(() => process.exit(1));
});
