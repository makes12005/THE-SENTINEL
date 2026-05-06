import { loadEnv } from './src/lib/load-env';
import postgres from 'postgres';

loadEnv();

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS buses (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agency_id     UUID NOT NULL REFERENCES agencies(id),
      number_plate  VARCHAR(20) NOT NULL,
      model         VARCHAR(255),
      capacity      INTEGER,
      is_active     BOOLEAN NOT NULL DEFAULT TRUE,
      added_by      UUID NOT NULL REFERENCES users(id),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS buses_agency_plate_unique ON buses(agency_id, number_plate);`,
    `CREATE INDEX IF NOT EXISTS buses_agency_idx ON buses(agency_id);`,
    `ALTER TABLE trips ADD COLUMN IF NOT EXISTS assigned_to_operator_id UUID REFERENCES users(id);`,
    `ALTER TABLE trips ADD COLUMN IF NOT EXISTS bus_id UUID REFERENCES buses(id);`,
    `CREATE INDEX IF NOT EXISTS trips_assigned_operator_idx ON trips(assigned_to_operator_id) WHERE assigned_to_operator_id IS NOT NULL;`,
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_unique;`,
    `ALTER TABLE agencies ALTER COLUMN phone TYPE VARCHAR(20);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_agency_phone_staff_unique ON users(agency_id, phone) WHERE role IN ('conductor', 'driver') AND phone IS NOT NULL;`,
    `CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone) WHERE phone IS NOT NULL;`
  ];

  for (const s of statements) {
    try {
      console.log('Executing:', s);
      await sql.unsafe(s);
      console.log('Success!');
    } catch (e) {
      console.error('Failed:', e);
    }
  }
  await sql.end();
}

run();
