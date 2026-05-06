import bcrypt from 'bcryptjs';
import postgres from 'postgres';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    return;
  }
  const sql = postgres(dbUrl);

  const hashPassword = async (pwd: string) => bcrypt.hash(pwd, 12);

  const adminHash = await hashPassword('BusAlert@2024');
  const ownerHash = await hashPassword('Test@1234');
  const operatorHash = await hashPassword('Test@1234');

  const admin = {
    name: 'Test Admin',
    email: 'admin@busalert.test',
    phone: '+919999999999',
    password_hash: adminHash,
    role: 'admin',
    is_active: true
  };

  const owner = {
    name: 'Test Owner',
    email: 'owner@busalert.test',
    phone: '+919876543000',
    password_hash: ownerHash,
    role: 'owner',
    is_active: true
  };

  const operator = {
    name: 'Test Operator',
    email: 'operator@busalert.test',
    phone: '+919876543001',
    password_hash: operatorHash,
    role: 'operator',
    is_active: true
  };

  const upsertUser = async (user: any, agencyId: string | null = null) => {
    const existing = await sql`SELECT id FROM users WHERE phone = ${user.phone}`;
    if (existing.length > 0) {
      await sql`UPDATE users SET role = ${user.role}, password_hash = ${user.password_hash}, name = ${user.name}, agency_id = ${agencyId}, is_active = ${user.is_active} WHERE phone = ${user.phone}`;
      return existing[0].id;
    } else {
      const [inserted] = await sql`INSERT INTO users (name, email, phone, password_hash, role, is_active, agency_id) VALUES (${user.name}, ${user.email}, ${user.phone}, ${user.password_hash}, ${user.role}, ${user.is_active}, ${agencyId}) RETURNING id`;
      return inserted.id;
    }
  };

  try {
    await upsertUser(admin);
    
    // For owner and operator, we need an agency.
    let agencyId = null;
    const existingAgency = await sql`SELECT id FROM agencies WHERE name = 'Test Agency' LIMIT 1`;
    if (existingAgency.length > 0) {
      agencyId = existingAgency[0].id;
    } else {
      const [newAgency] = await sql`INSERT INTO agencies (name, phone, email, state) VALUES ('Test Agency', '+919876543000', 'owner@busalert.test', 'Gujarat') RETURNING id`;
      agencyId = newAgency.id;
      
      // Give them a wallet
      await sql`INSERT INTO agency_wallets (agency_id, trips_remaining, trips_used_this_month, low_trip_threshold) VALUES (${agencyId}, 100, 0, 10)`;
    }

    await upsertUser(owner, agencyId);
    await upsertUser(operator, agencyId);
    
    console.log('Test users seeded successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}
main().catch(console.error);
