import { db } from './src/db';
import { users } from './src/db/schema';
import { eq, or } from 'drizzle-orm';

async function main() {
  const email = 'mahekzalavadiya123@gmail.com';
  const phone = '+917778069828';
  
  console.log(`Checking for admin: ${email} or ${phone}`);
  
  try {
    const admin = await db.select().from(users).where(
      or(eq(users.email, email), eq(users.phone, phone))
    ).limit(1);

    if (admin.length === 0) {
      console.log('Admin user NOT found in database.');
    } else {
      console.log('Admin user FOUND:');
      console.log(JSON.stringify(admin[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

main();
