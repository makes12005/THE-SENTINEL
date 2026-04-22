import bcrypt from 'bcryptjs';
import postgres from 'postgres';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    return;
  }

  const sql = postgres(dbUrl);

  const password = 'Maahek$1210';
  const saltRounds = 12;
  
  console.log('Generating hash...');
  const hash = await bcrypt.hash(password, saltRounds);
  
  const user = {
    name: 'mahek',
    email: 'mahekzalavadiya123@gmail.com',
    phone: '+917778069828',
    password_hash: hash,
    role: 'admin',
    is_active: true
  };

  console.log('Attempting to create/update admin user:', user.email);

  try {
    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${user.email} OR phone = ${user.phone}`;
    
    if (existing.length > 0) {
      console.log('User already exists. Updating...');
      await sql`
        UPDATE users 
        SET role = ${user.role}, password_hash = ${user.password_hash}, name = ${user.name}
        WHERE email = ${user.email} OR phone = ${user.phone}
      `;
      console.log('User updated successfully.');
    } else {
      console.log('Inserting new user...');
      const [insertedUser] = await sql`
        INSERT INTO users (name, email, phone, password_hash, role, is_active)
        VALUES (${user.name}, ${user.email}, ${user.phone}, ${user.password_hash}, ${user.role}, ${user.is_active})
        RETURNING id
      `;
      console.log('Admin user created successfully with ID:', insertedUser.id);
    }
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
