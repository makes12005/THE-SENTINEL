import { db } from '../db'
import { users } from '../db/schema'
import bcrypt from 'bcryptjs'

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(
    'BusAlert@2024', 12
  )
  
  await db.insert(users).values({
    name: 'Super Admin',
    phone: '+919999999999',
    email: 'admin@busalert.in',
    password_hash: passwordHash,
    role: 'admin',
    agency_id: null,
    is_active: true,
  })
  
  console.log('✅ Admin created')
  console.log('Phone: +919999999999')
  console.log('Password: BusAlert@2024')
  process.exit(0)
}

seedAdmin().catch(console.error)
