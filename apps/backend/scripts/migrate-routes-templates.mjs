/**
 * Manual migration script — run once to apply schema changes for Routes & Templates sprint.
 * Usage: node scripts/migrate-routes-templates.mjs
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.production') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL not found in .env.production');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function run() {
  console.log('🚀  Applying schema changes…\n');

  // 1. Add is_active to routes (if not exists)
  await sql`
    ALTER TABLE routes
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id)
  `;
  console.log('✅  routes: added is_active, created_by');

  // 2. Add created_at to stops (if not exists)
  await sql`
    ALTER TABLE stops
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `;
  console.log('✅  stops: added created_at');

  // 3. Create trip_templates table
  await sql`
    CREATE TABLE IF NOT EXISTS trip_templates (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agency_id      UUID NOT NULL REFERENCES agencies(id),
      name           VARCHAR(255) NOT NULL,
      route_id       UUID NOT NULL REFERENCES routes(id),
      bus_id         UUID REFERENCES buses(id),
      conductor_id   UUID REFERENCES users(id),
      driver_id      UUID REFERENCES users(id),
      departure_time VARCHAR(10),
      arrival_time   VARCHAR(10),
      notes          TEXT,
      is_active      BOOLEAN NOT NULL DEFAULT TRUE,
      created_by     UUID NOT NULL REFERENCES users(id),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log('✅  trip_templates: table created');

  // 4. Add unique constraint on (agency_id, name) for trip_templates
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'templates_agency_name_unique'
      ) THEN
        ALTER TABLE trip_templates
          ADD CONSTRAINT templates_agency_name_unique UNIQUE (agency_id, name);
      END IF;
    END $$
  `;
  console.log('✅  trip_templates: unique constraint (agency_id, name) ensured');

  // 5. Index on agency_id for fast filtering
  await sql`
    CREATE INDEX IF NOT EXISTS templates_agency_idx ON trip_templates(agency_id)
  `;
  console.log('✅  trip_templates: agency index created');

  console.log('\n🎉  Migration complete!');
  await sql.end();
}

run().catch((err) => {
  console.error('❌  Migration failed:', err.message);
  process.exit(1);
});
