const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '.env.production') });

const sql = postgres(process.env.DATABASE_URL);

async function assignTrip() {
  try {
    const [agency] = await sql`SELECT id FROM agencies WHERE name = 'Test Agency' LIMIT 1`;
    const [driver] = await sql`SELECT id FROM users WHERE phone = '+919876543210' LIMIT 1`;
    const [route] = await sql`SELECT id FROM routes LIMIT 1`;
    
    // Find an operator and a conductor for this agency
    const [operator] = await sql`SELECT id FROM users WHERE role = 'operator' LIMIT 1`;
    const [conductor] = await sql`SELECT id FROM users WHERE role = 'conductor' LIMIT 1`;

    if (!agency || !driver || !route || !operator || !conductor) {
      console.log("Missing data:", { agency: !!agency, driver: !!driver, route: !!route, operator: !!operator, conductor: !!conductor });
      return;
    }

    // Check if driver has active trip
    const [existingTrip] = await sql`
      SELECT id FROM trips 
      WHERE driver_id = ${driver.id} 
      AND status IN ('scheduled', 'active') 
      LIMIT 1
    `;

    if (existingTrip) {
      console.log("Driver already has an active trip:", existingTrip.id);
    } else {
      const [newTrip] = await sql`
        INSERT INTO trips (
          route_id, operator_id, conductor_id, driver_id, bus_id, 
          status, scheduled_date, scheduled_time
        ) VALUES (
          ${route.id}, ${operator.id}, ${conductor.id}, ${driver.id}, null,
          'scheduled', CURRENT_DATE, '10:00'
        ) RETURNING id
      `;
      console.log("Created new trip:", newTrip.id);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

assignTrip();
