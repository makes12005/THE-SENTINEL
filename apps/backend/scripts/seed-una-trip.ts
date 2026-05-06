import { db, sql } from '../src/db/index';
import { agencies, users, routes, stops, trips, tripPassengers } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function seedUnaTrip() {
  console.log('Seeding Una to Ahmedabad trip...');

  const [agency] = await db.select().from(agencies).limit(1);
  if (!agency) {
    console.error('No agency found! Please run the generic seed script first.');
    process.exit(1);
  }

  // Find an admin or owner/operator to own the trip
  const [operator] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
  if (!operator) {
    console.error('No admin found!');
    process.exit(1);
  }

  // Find or create a conductor
  let [conductor] = await db.select().from(users).where(eq(users.role, 'conductor')).limit(1);
  if (!conductor) {
    console.log('Creating a dummy conductor...');
    [conductor] = await db.insert(users).values({
      name: 'Ramesh Conductor',
      phone: '+919999999999',
      role: 'conductor',
      password_hash: 'dummyhash',
      agency_id: agency.id,
    }).returning();
  }

  // 1. Create Route
  console.log('Creating route: Una to Ahmedabad');
  const [route] = await db.insert(routes).values({
    name: 'Una - Ahmedabad Express',
    from_city: 'Una',
    to_city: 'Ahmedabad',
    agency_id: agency.id,
  }).returning();

  // 2. Create Stops
  console.log('Creating stops...');
  const stopsData = [
    { name: 'Una Depot', seq: 1, lat: 20.8252, lng: 71.0384 },
    { name: 'Rajula Bypass', seq: 2, lat: 21.0388, lng: 71.4398 },
    { name: 'Mahuva Chokdi', seq: 3, lat: 21.0914, lng: 71.7645 },
    { name: 'Bhavnagar Bus Stand', seq: 4, lat: 21.7645, lng: 72.1519 },
    { name: 'Ahmedabad Geeta Mandir', seq: 5, lat: 23.0225, lng: 72.5714 }
  ];

  const insertedStops = [];
  for (const stop of stopsData) {
    const pointStr = `POINT(${stop.lng} ${stop.lat})`;
    const [inserted] = await db.insert(stops).values({
      route_id: route.id,
      name: stop.name,
      sequence_number: stop.seq,
      coordinates: pointStr,
      trigger_radius_km: '10.00',
    }).returning();
    insertedStops.push(inserted);
  }

  // 3. Create Trip for Tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const scheduledDate = tomorrow.toISOString().split('T')[0];

  console.log(`Creating trip for ${scheduledDate}...`);
  const [trip] = await db.insert(trips).values({
    route_id: route.id,
    owned_by_operator_id: operator.id,
    conductor_id: conductor.id,
    status: 'scheduled',
    scheduled_date: scheduledDate,
  }).returning();

  // 4. Add Demo Passengers
  console.log('Adding demo passengers...');
  const passengers = [
    { name: 'Rahul Bhai', phone: '+919876543210', stop: insertedStops[1] },
    { name: 'Sanjay Kumar', phone: '+918765432109', stop: insertedStops[2] },
    { name: 'Amit Patel', phone: '+917654321098', stop: insertedStops[3] },
    { name: 'Nilesh', phone: '+916543210987', stop: insertedStops[4] },
    { name: 'Mahesh Bhai', phone: '+915432109876', stop: insertedStops[3] }
  ];

  for (const p of passengers) {
    await db.insert(tripPassengers).values({
      trip_id: trip.id,
      passenger_name: p.name,
      passenger_phone: p.phone,
      stop_id: p.stop.id,
      alert_status: 'pending',
    });
  }

  console.log('Successfully seeded Una-Ahmedabad trip data!');
  process.exit(0);
}

seedUnaTrip().catch((err) => {
  console.error(err);
  process.exit(1);
});
