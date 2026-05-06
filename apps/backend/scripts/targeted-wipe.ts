/**
 * targeted-wipe.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Keeps ONLY these two users (by phone):
 *   - +917778069828  (admin — Mahek)
 *   - +919825247228  (owner — hari)
 *
 * Deletes ALL other data in every table:
 *   alert_logs, conductor_locations, trip_passengers, trips,
 *   wallet_transactions, agency_wallets, stops, routes, buses,
 *   refresh_tokens, audit_logs, agency_invites,
 *   agencies (any demo agency not belonging to the real owner),
 *   users (any user that is NOT the 2 real ones)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('\n❌  DATABASE_URL not set'); process.exit(1); }

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SENTINEL — TARGETED DATA WIPE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Pre-check: show who we are keeping ───────────────────────────────────
  const keepUsers = await sql`
    SELECT id, name, phone, role FROM users
    WHERE phone IN ('+917778069828', '+919825247228')
    ORDER BY created_at
  `;
  console.log('👥  Users we are KEEPING:');
  keepUsers.forEach(u => console.log(`    [${u.role.padEnd(8)}] ${u.name} — ${u.phone}`));
  console.log('');

  // ── Step 1: Delete everything that references trips / passengers ──────────
  console.log('🔴  Wiping operational data (leaf-first)...\n');

  const r1 = await sql`DELETE FROM alert_logs`;
  console.log(`  ✓  alert_logs          — ${r1.count} rows deleted`);

  const r2 = await sql`DELETE FROM conductor_locations`;
  console.log(`  ✓  conductor_locations  — ${r2.count} rows deleted`);

  const r3 = await sql`DELETE FROM trip_passengers`;
  console.log(`  ✓  trip_passengers      — ${r3.count} rows deleted`);

  const r4 = await sql`DELETE FROM trips`;
  console.log(`  ✓  trips                — ${r4.count} rows deleted`);

  const r5 = await sql`DELETE FROM wallet_transactions`;
  console.log(`  ✓  wallet_transactions  — ${r5.count} rows deleted`);

  const r6 = await sql`DELETE FROM agency_wallets`;
  console.log(`  ✓  agency_wallets       — ${r6.count} rows deleted`);

  const r7 = await sql`DELETE FROM stops`;
  console.log(`  ✓  stops                — ${r7.count} rows deleted`);

  const r8 = await sql`DELETE FROM routes`;
  console.log(`  ✓  routes               — ${r8.count} rows deleted`);

  const r9 = await sql`DELETE FROM buses`;
  console.log(`  ✓  buses                — ${r9.count} rows deleted`);

  const r10 = await sql`DELETE FROM refresh_tokens`;
  console.log(`  ✓  refresh_tokens       — ${r10.count} rows deleted`);

  const r11 = await sql`DELETE FROM audit_logs`;
  console.log(`  ✓  audit_logs           — ${r11.count} rows deleted`);

  // ── Step 2: Delete any extra users (not the 2 real ones) ─────────────────
  const r12 = await sql`
    DELETE FROM users
    WHERE phone NOT IN ('+917778069828', '+919825247228')
  `;
  console.log(`  ✓  users (extra)        — ${r12.count} rows deleted`);

  // ── Step 3: Delete ALL agencies (real owner will re-create their agency
  //            via the onboarding flow or we can leave the real one) ─────────
  // First, detach the real owner's agency_id reference so we can safely wipe
  await sql`UPDATE users SET agency_id = NULL WHERE phone = '+919825247228'`;

  const r13 = await sql`DELETE FROM agencies`;
  console.log(`  ✓  agencies             — ${r13.count} rows deleted`);

  const r14 = await sql`DELETE FROM agency_invites`;
  console.log(`  ✓  agency_invites       — ${r14.count} rows deleted`);

  // ── Step 4: Final state check ─────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  WIPE COMPLETE — Final database state:\n');

  const finalUsers = await sql`SELECT name, phone, role, agency_id FROM users ORDER BY created_at`;
  finalUsers.forEach(u =>
    console.log(`  [${u.role.padEnd(8)}] ${u.name} | ${u.phone} | agency_id: ${u.agency_id ?? 'NULL'}`)
  );

  const [agCount] = await sql`SELECT COUNT(*)::int as c FROM agencies`;
  const [rtCount] = await sql`SELECT COUNT(*)::int as c FROM routes`;
  const [buCount] = await sql`SELECT COUNT(*)::int as c FROM buses`;
  const [trCount] = await sql`SELECT COUNT(*)::int as c FROM trips`;

  console.log(`\n  agencies             : ${agCount.c}`);
  console.log(`  routes               : ${rtCount.c}`);
  console.log(`  buses                : ${buCount.c}`);
  console.log(`  trips                : ${trCount.c}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Database is clean — only 2 real users remain.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await sql.end();
  process.exit(0);
}

main().catch(e => {
  console.error('\n❌  Failed:', e.message ?? e);
  sql.end().finally(() => process.exit(1));
});
