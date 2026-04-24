import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from the current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

const dbUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_yxAdsK94wclz@ep-late-mouse-ancgm810-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = postgres(dbUrl);

async function main() {
  const password = 'Maahek$1210';
  const hash = await bcrypt.hash(password, 12);
  
  const user = {
    name: 'mahek',
    email: 'mahekzalavadiya123@gmail.com',
    phone: '+917778069828',
    password_hash: hash,
    role: 'admin' as const,
    is_active: true
  };

  console.log('Attempting to create/update admin user:', user.email);

  try {
    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${user.email} OR phone = ${user.phone}`;
    
    if (existing.length > 0) {
      console.log('User already exists with this email or phone. Updating role and password...');
      await sql`
        UPDATE users 
        SET role = ${user.role}, password_hash = ${user.password_hash}, name = ${user.name}
        WHERE email = ${user.email} OR phone = ${user.phone}
      `;
      console.log('User updated successfully.');
    } else {
      const [insertedUser] = await sql`
        INSERT INTO users (name, email, phone, password_hash, role, is_active)
        VALUES (${user.name}, ${user.email}, ${user.phone}, ${user.password_hash}, ${user.role}, ${user.is_active})
        RETURNING id
      `;
      console.log('Admin user created successfully with ID:', insertedUser.id);
    }
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await sql.end();
  }
}

main();
