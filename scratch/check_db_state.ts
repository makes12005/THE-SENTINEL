
import { db } from '../apps/backend/src/db/index';
import { users, agencies } from '../apps/backend/src/db/schema';

async function checkState() {
  const allAgencies = await db.select().from(agencies);
  console.log('--- AGENCIES ---');
  console.table(allAgencies.map(a => ({ id: a.id, name: a.name, phone: a.phone })));

  const allUsers = await db.select().from(users);
  console.log('--- USERS ---');
  console.table(allUsers.map(u => ({
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
