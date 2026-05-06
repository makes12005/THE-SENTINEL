import { db } from '../src/db';
import { trips, agencies, routes } from '../src/db/schema';
import { uploadPassengers } from '../src/modules/trips/passengers.service';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function verifyUpload() {
  console.log('Testing manifest upload logic...');

  // 1. Find the test trip (Una to Ahmedabad Express)
  const [route] = await db.select().from(routes).where(eq(routes.name, 'Una - Ahmedabad Express')).limit(1);
  if (!route) {
    console.error('Test route not found. Run seed script first.');
    process.exit(1);
  }

  const [trip] = await db.select().from(trips).where(eq(trips.route_id, route.id)).limit(1);
  if (!trip) {
    console.error('Test trip not found. Run seed script first.');
    process.exit(1);
  }

  const [agency] = await db.select().from(agencies).where(eq(agencies.id, route.agency_id)).limit(1);
  if (!agency) {
    console.error('Agency not found.');
    process.exit(1);
  }

  // 2. Clear existing passengers for this trip to test fresh upload
  console.log(`Clearing existing passengers for trip ${trip.id}...`);
  const { tripPassengers } = await import('../src/db/schema');
  await db.delete(tripPassengers).where(eq(tripPassengers.trip_id, trip.id));

  // 3. Load the sample CSV
  const csvPath = path.join(__dirname, 'manifest_sample.csv');
  const buffer = fs.readFileSync(csvPath);

  console.log(`Uploading manifest for trip ${trip.id}...`);

  try {
    const result = await uploadPassengers(
      trip.id,
      agency.id,
      buffer,
      'text/csv',
      'manifest_sample.csv'
    );

    console.log('Upload Result:', result);
    console.log('Verification SUCCESS!');
  } catch (error: any) {
    console.error('Verification FAILED!');
    if (error.rowErrors) {
      console.error('Row Errors:', JSON.stringify(error.rowErrors, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }

  process.exit(0);
}

verifyUpload().catch(err => {
  console.error('System Error:', err);
  process.exit(1);
});
