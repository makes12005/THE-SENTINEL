import { db } from './src/db';
import { users } from './src/db/schema';

async function main() {
  console.log('--- Fetching all users from production database ---');
  try {
    const allUsers = await db.select().from(users);

    if (allUsers.length === 0) {
      console.log('No users found.');
      return;
    }

    console.log('Total users:', allUsers.length);
    
    // Format for console output (CSV-like or JSON so I can format it better)
    const result = allUsers.map(u => ({
      Name: u.name,
      Phone: u.phone || 'N/A',
      Email: u.email || 'N/A',
      Role: u.role,
      PasswordHash: u.password_hash,
      IsActive: u.is_active
    }));

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    process.exit(0);
  }
}

main();
