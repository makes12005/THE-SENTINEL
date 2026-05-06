
const { db } = require('./apps/backend/src/db/index');
const { users, agencies } = require('./apps/backend/src/db/schema');
const { eq } = require('drizzle-orm');

async function checkState() {
  const allAgencies = await db.select().from(agencies);
  console.log('Agencies:', allAgencies);

  const allUsers = await db.select().from(users);
  console.log('Users (Role/Agency):', allUsers.map(u => ({
    phone: u.phone,
    role: u.role,
    agency_id: u.agency_id
  })));
  
  process.exit(0);
}

checkState().catch(err => {
  console.error(err);
  process.exit(1);
});
