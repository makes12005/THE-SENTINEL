import test from 'node:test';
import assert from 'node:assert';
import { db, sql as connection } from '../db';
import { agencies, users, routes, trips, auditLogs } from '../db/schema';
import { verifyTripAgency } from '../modules/trips/trip-auth.helper';
import { TripsService } from '../modules/trips/trips.service';
import { LocationService } from '../modules/trips/location.service';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Trip Security Tests
 * Verifies agency isolation using the verifyTripAgency helper.
 */
test('Trip Security - Agency Isolation', async (t) => {
  let agencyA: string;
  let agencyB: string;
  let operatorA: string;
  let operatorB: string;
  let conductorA: string;
  let conductorB: string;
  let admin: string;
  let routeA: string;
  let tripA: string;

  await t.test('Setup: Seed test data', async () => {
    const uniqueSuffix = Date.now().toString().slice(-6);

    // 1. Create Agencies
    const [a1] = await db.insert(agencies).values({
      name: `Agency A ${uniqueSuffix}`,
      phone: `9100${uniqueSuffix}`,
      email: `a_${uniqueSuffix}@test.com`,
      state: 'Gujarat',
      invite_code: `TA_${uniqueSuffix}`
    }).returning({ id: agencies.id });
    agencyA = a1.id;

    const [a2] = await db.insert(agencies).values({
      name: `Agency B ${uniqueSuffix}`,
      phone: `9101${uniqueSuffix}`,
      email: `b_${uniqueSuffix}@test.com`,
      state: 'Gujarat',
      invite_code: `TB_${uniqueSuffix}`
    }).returning({ id: agencies.id });
    agencyB = a2.id;

    // 2. Create Users
    const [u1] = await db.insert(users).values({
      agency_id: agencyA,
      name: `Operator A ${uniqueSuffix}`,
      phone: `9102${uniqueSuffix}`,
      password_hash: 'hash',
      role: 'operator'
    }).returning({ id: users.id });
    operatorA = u1.id;

    const [u2] = await db.insert(users).values({
      agency_id: agencyB,
      name: `Operator B ${uniqueSuffix}`,
      phone: `9103${uniqueSuffix}`,
      password_hash: 'hash',
      role: 'operator'
    }).returning({ id: users.id });
    operatorB = u2.id;

    const [u3] = await db.insert(users).values({
      name: `Super Admin ${uniqueSuffix}`,
      phone: `9104${uniqueSuffix}`,
      password_hash: 'hash',
      role: 'admin'
    }).returning({ id: users.id });
    admin = u3.id;

    // 4. Create Conductors for Agency A
    const [c1] = await db.insert(users).values({
      agency_id: agencyA,
      name: `Conductor A ${uniqueSuffix}`,
      phone: `9105${uniqueSuffix}`,
      password_hash: 'hash',
      role: 'conductor'
    }).returning({ id: users.id });
    conductorA = c1.id;

    const [c2] = await db.insert(users).values({
      agency_id: agencyA,
      name: `Conductor B ${uniqueSuffix}`,
      phone: `9106${uniqueSuffix}`,
      password_hash: 'hash',
      role: 'conductor'
    }).returning({ id: users.id });
    conductorB = c2.id;

    // 5. Create Route and Trip for Agency A (assigned to Conductor A)
    const [r1] = await db.insert(routes).values({
      agency_id: agencyA,
      name: `Route A ${uniqueSuffix}`,
      from_city: 'City A',
      to_city: 'City B'
    }).returning({ id: routes.id });
    routeA = r1.id;

    const [t1] = await db.insert(trips).values({
      route_id: routeA,
      owned_by_operator_id: operatorA,
      assigned_operator_id: operatorA,
      conductor_id: conductorA,
      scheduled_date: new Date().toISOString().split('T')[0]
    }).returning({ id: trips.id });
    tripA = t1.id;
  });

  await t.test('Test 1: Operator from Agency B cannot access trip from Agency A', async () => {
    try {
      await verifyTripAgency(tripA, agencyB, operatorB, 'operator');
      assert.fail('Should have thrown Forbidden error');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 403);
      assert.strictEqual(err.code, 'FORBIDDEN');
    }
  });

  await t.test('Test 2: Operator from Agency A can access trip from Agency A', async () => {
    const trip = await verifyTripAgency(tripA, agencyA, operatorA, 'operator');
    assert.strictEqual(trip.id, tripA);
  });

  await t.test('Test 3: Admin can access trip from any agency', async () => {
    const trip = await verifyTripAgency(tripA, 'some-other-agency', admin, 'admin');
    assert.strictEqual(trip.id, tripA);
  });

  await t.test('Test 4: Conductor can only start their own assigned trip', async () => {
    // Conductor B tries to start Conductor A's trip
    try {
      await TripsService.startTrip(tripA, conductorB);
      assert.fail('Should have thrown Forbidden error');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 403);
      assert.match(err.message, /not assigned/);
    }

    // Conductor A starts their own trip
    const started = await TripsService.startTrip(tripA, conductorA);
    assert.strictEqual(started.status, 'active');
  });

  await t.test('Test 5: Conductor can only complete their own assigned trip', async () => {
    // Conductor B tries to complete Conductor A's trip
    try {
      await TripsService.completeTrip(tripA, conductorB);
      assert.fail('Should have thrown Forbidden error');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 403);
      assert.match(err.message, /not assigned/);
    }

    // Conductor A completes their own trip
    const completed = await TripsService.completeTrip(tripA, conductorA);
    assert.strictEqual(completed.status, 'completed');
  });

  await t.test('Test 6: Conductor can only update location for their own assigned trip', async () => {
    // Reset trip to active for location testing (since completeTrip set it to completed)
    await db.update(trips).set({ status: 'active' }).where(eq(trips.id, tripA));

    try {
      await LocationService.assertConductorOwnsActiveTrip(tripA, conductorB);
      assert.fail('Should have thrown Forbidden error');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 403);
      assert.match(err.message, /not assigned/);
    }

    // Verify an audit log was created for the above failure
    const [log] = await db.select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.user_id, conductorB),
        eq(auditLogs.action, 'UNAUTHORIZED_LOCATION_UPDATE_ATTEMPT')
      ))
      .limit(1);
    
    assert.ok(log, 'Audit log should have been created');
    assert.strictEqual(log.entity_id, tripA);
  });

  await t.test('Cleanup: Remove test data', async () => {
    // Delete in order of dependencies
    const allUserIds = [operatorA, operatorB, conductorA, conductorB, admin];
    for (const uid of allUserIds) {
      if (uid) await db.delete(auditLogs).where(eq(auditLogs.user_id, uid));
    }
    
    await db.delete(trips).where(eq(trips.id, tripA));
    await db.delete(routes).where(eq(routes.id, routeA));
    for (const uid of allUserIds) {
      if (uid) await db.delete(users).where(eq(users.id, uid));
    }
    await db.delete(agencies).where(eq(agencies.id, agencyA));
    await db.delete(agencies).where(eq(agencies.id, agencyB));
    
    // Close DB connection to exit gracefully
    await connection.end();
  });
});
