import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function addColumn() {
  console.log('Adding scheduled_time column...');
  try {
    await db.execute(sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduled_time varchar`);
    console.log('Column scheduled_time added successfully.');
    
    // Also add assigned_operator_id if it's missing (I remember adding it but better be safe)
    await db.execute(sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS assigned_operator_id uuid REFERENCES users(id)`);
    console.log('Column assigned_operator_id added successfully.');

  } catch (err) {
    console.error('Error adding column:', err);
  }
  process.exit(0);
}

addColumn();
