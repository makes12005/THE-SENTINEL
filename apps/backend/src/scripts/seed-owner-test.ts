/**
 * Seed script — creates a test Agency + Owner account for local audit testing.
 * Run: npx tsx src/scripts/seed-owner-test.ts
 *
 * Credentials created:
 *   Owner  →  +919876543000 / Test@1234
 *   Operator → +919876543001 / Test@1234
 */
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { agencies, agencyWallets, users } from '../db/schema';
import { eq } from 'drizzle-orm';

const OWNER_PHONE = '+919876543000';
const OP_PHONE    = '+919876543001';
const PASSWORD    = 'Test@1234';

async function seedOwnerTest() {
  console.log('🌱  Seeding test owner account…');

  // ── 1. Agency ──────────────────────────────────────────────────────────────
  let [agency] = await db
    .select({ id: agencies.id, name: agencies.name })
    .from(agencies)
    .where(eq(agencies.phone, OWNER_PHONE))
    .limit(1);

  if (!agency) {
    [agency] = await db
      .insert(agencies)
      .values({
        name:  'Gujarat Test Transport',
        phone: OWNER_PHONE,
        email: 'owner@testgtl.in',
        state: 'Gujarat',
      })
      .returning({ id: agencies.id, name: agencies.name });
    console.log('✅  Agency created:', agency.name, agency.id);
  } else {
    console.log('ℹ️   Agency already exists:', agency.name, agency.id);
  }

  // ── 2. Wallet ───────────────────────────────────────────────────────────────
  const [existingWallet] = await db
    .select({ id: agencyWallets.agency_id })
    .from(agencyWallets)
    .where(eq(agencyWallets.agency_id, agency.id))
    .limit(1);

  if (!existingWallet) {
    await db.insert(agencyWallets).values({
      agency_id:             agency.id,
      trips_remaining:       50,
      trips_used_this_month: 12,
    });
    console.log('✅  Wallet seeded (50 trips)');
  } else {
    console.log('ℹ️   Wallet already exists');
  }

  // ── 3. Owner user ───────────────────────────────────────────────────────────
  const hash = await bcrypt.hash(PASSWORD, 12);

  const [existingOwner] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.phone, OWNER_PHONE))
    .limit(1);

  if (!existingOwner) {
    const [owner] = await db
      .insert(users)
      .values({
        name:          'Test Agency Owner',
        phone:         OWNER_PHONE,
        password_hash: hash,
        role:          'owner',
        agency_id:     agency.id,
        is_active:     true,
      })
      .returning({ id: users.id, name: users.name, role: users.role });
    console.log('✅  Owner created:', owner.name, owner.role, owner.id);
  } else {
    // Update role to owner if it was set to admin by mistake
    if (existingOwner.role !== 'owner') {
      await db
        .update(users)
        .set({ role: 'owner', agency_id: agency.id, password_hash: hash })
        .where(eq(users.phone, OWNER_PHONE));
      console.log(`⚠️   Existing user role changed from '${existingOwner.role}' → 'owner'`);
    } else {
      console.log('ℹ️   Owner already exists');
    }
  }

  // ── 4. Test Operator ────────────────────────────────────────────────────────
  const [existingOp] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, OP_PHONE))
    .limit(1);

  if (!existingOp) {
    const [op] = await db
      .insert(users)
      .values({
        name:          'Test Operator One',
        phone:         OP_PHONE,
        password_hash: hash,
        role:          'operator',
        agency_id:     agency.id,
        is_active:     true,
      })
      .returning({ id: users.id, name: users.name });
    console.log('✅  Operator created:', op.name, op.id);
  } else {
    console.log('ℹ️   Operator already exists');
  }

  console.log('\n🎯  Done. Test credentials:');
  console.log('   Owner    →  ', OWNER_PHONE, '/', PASSWORD);
  console.log('   Operator →  ', OP_PHONE,    '/', PASSWORD);
  process.exit(0);
}

seedOwnerTest().catch((err) => { console.error(err); process.exit(1); });
