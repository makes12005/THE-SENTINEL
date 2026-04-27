require('dotenv').config({ path: 'apps/backend/.env.production' });
const postgres = require('postgres');
const bcrypt = require('bcryptjs');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  const agencies = await sql`select id, name from agencies order by created_at asc limit 1`;
  if (!agencies.length) throw new Error('No agency found');
  const agencyId = agencies[0].id;

  const phone = '+919876543011';
  const passwordHash = await bcrypt.hash('Test@1234', 12);

  const existing = await sql`select id from users where phone = ${phone} limit 1`;
  if (existing.length) {
    await sql`
      update users
      set agency_id = ${agencyId},
          role = 'operator',
          is_active = true
      where id = ${existing[0].id}
    `;
  } else {
    await sql`
      insert into users (agency_id, name, phone, password_hash, role, is_active, created_at)
      values (${agencyId}, 'Fix Test Operator', ${phone}, ${passwordHash}, 'operator', true, now())
    `;
  }

  console.log(`seeded operator ${phone} for agency ${agencyId}`);
  await sql.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
