"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const trip_auth_helper_1 = require("../modules/trips/trip-auth.helper");
const trips_service_1 = require("../modules/trips/trips.service");
const location_service_1 = require("../modules/trips/location.service");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Trip Security Tests
 * Verifies agency isolation using the verifyTripAgency helper.
 */
(0, node_test_1.default)('Trip Security - Agency Isolation', async (t) => {
    let agencyA;
    let agencyB;
    let operatorA;
    let operatorB;
    let conductorA;
    let conductorB;
    let admin;
    let routeA;
    let tripA;
    await t.test('Setup: Seed test data', async () => {
        const uniqueSuffix = Date.now().toString().slice(-6);
        // 1. Create Agencies
        const [a1] = await db_1.db.insert(schema_1.agencies).values({
            name: `Agency A ${uniqueSuffix}`,
            phone: `9100${uniqueSuffix}`,
            email: `a_${uniqueSuffix}@test.com`,
            state: 'Gujarat',
            invite_code: `TA_${uniqueSuffix}`
        }).returning({ id: schema_1.agencies.id });
        agencyA = a1.id;
        const [a2] = await db_1.db.insert(schema_1.agencies).values({
            name: `Agency B ${uniqueSuffix}`,
            phone: `9101${uniqueSuffix}`,
            email: `b_${uniqueSuffix}@test.com`,
            state: 'Gujarat',
            invite_code: `TB_${uniqueSuffix}`
        }).returning({ id: schema_1.agencies.id });
        agencyB = a2.id;
        // 2. Create Users
        const [u1] = await db_1.db.insert(schema_1.users).values({
            agency_id: agencyA,
            name: `Operator A ${uniqueSuffix}`,
            phone: `9102${uniqueSuffix}`,
            password_hash: 'hash',
            role: 'operator'
        }).returning({ id: schema_1.users.id });
        operatorA = u1.id;
        const [u2] = await db_1.db.insert(schema_1.users).values({
            agency_id: agencyB,
            name: `Operator B ${uniqueSuffix}`,
            phone: `9103${uniqueSuffix}`,
            password_hash: 'hash',
            role: 'operator'
        }).returning({ id: schema_1.users.id });
        operatorB = u2.id;
        const [u3] = await db_1.db.insert(schema_1.users).values({
            name: `Super Admin ${uniqueSuffix}`,
            phone: `9104${uniqueSuffix}`,
            password_hash: 'hash',
            role: 'admin'
        }).returning({ id: schema_1.users.id });
        admin = u3.id;
        // 4. Create Conductors for Agency A
        const [c1] = await db_1.db.insert(schema_1.users).values({
            agency_id: agencyA,
            name: `Conductor A ${uniqueSuffix}`,
            phone: `9105${uniqueSuffix}`,
            password_hash: 'hash',
            role: 'conductor'
        }).returning({ id: schema_1.users.id });
        conductorA = c1.id;
        const [c2] = await db_1.db.insert(schema_1.users).values({
            agency_id: agencyA,
            name: `Conductor B ${uniqueSuffix}`,
            phone: `9106${uniqueSuffix}`,
            password_hash: 'hash',
            role: 'conductor'
        }).returning({ id: schema_1.users.id });
        conductorB = c2.id;
        // 5. Create Route and Trip for Agency A (assigned to Conductor A)
        const [r1] = await db_1.db.insert(schema_1.routes).values({
            agency_id: agencyA,
            name: `Route A ${uniqueSuffix}`,
            from_city: 'City A',
            to_city: 'City B'
        }).returning({ id: schema_1.routes.id });
        routeA = r1.id;
        const [t1] = await db_1.db.insert(schema_1.trips).values({
            route_id: routeA,
            owned_by_operator_id: operatorA,
            assigned_operator_id: operatorA,
            conductor_id: conductorA,
            scheduled_date: new Date().toISOString().split('T')[0]
        }).returning({ id: schema_1.trips.id });
        tripA = t1.id;
    });
    await t.test('Test 1: Operator from Agency B cannot access trip from Agency A', async () => {
        try {
            await (0, trip_auth_helper_1.verifyTripAgency)(tripA, agencyB, operatorB, 'operator');
            node_assert_1.default.fail('Should have thrown Forbidden error');
        }
        catch (err) {
            node_assert_1.default.strictEqual(err.statusCode, 403);
            node_assert_1.default.strictEqual(err.code, 'FORBIDDEN');
        }
    });
    await t.test('Test 2: Operator from Agency A can access trip from Agency A', async () => {
        const trip = await (0, trip_auth_helper_1.verifyTripAgency)(tripA, agencyA, operatorA, 'operator');
        node_assert_1.default.strictEqual(trip.id, tripA);
    });
    await t.test('Test 3: Admin can access trip from any agency', async () => {
        const trip = await (0, trip_auth_helper_1.verifyTripAgency)(tripA, 'some-other-agency', admin, 'admin');
        node_assert_1.default.strictEqual(trip.id, tripA);
    });
    await t.test('Test 4: Conductor can only start their own assigned trip', async () => {
        // Conductor B tries to start Conductor A's trip
        try {
            await trips_service_1.TripsService.startTrip(tripA, conductorB);
            node_assert_1.default.fail('Should have thrown Forbidden error');
        }
        catch (err) {
            node_assert_1.default.strictEqual(err.statusCode, 403);
            node_assert_1.default.match(err.message, /not assigned/);
        }
        // Conductor A starts their own trip
        const started = await trips_service_1.TripsService.startTrip(tripA, conductorA);
        node_assert_1.default.strictEqual(started.status, 'active');
    });
    await t.test('Test 5: Conductor can only complete their own assigned trip', async () => {
        // Conductor B tries to complete Conductor A's trip
        try {
            await trips_service_1.TripsService.completeTrip(tripA, conductorB);
            node_assert_1.default.fail('Should have thrown Forbidden error');
        }
        catch (err) {
            node_assert_1.default.strictEqual(err.statusCode, 403);
            node_assert_1.default.match(err.message, /not assigned/);
        }
        // Conductor A completes their own trip
        const completed = await trips_service_1.TripsService.completeTrip(tripA, conductorA);
        node_assert_1.default.strictEqual(completed.status, 'completed');
    });
    await t.test('Test 6: Conductor can only update location for their own assigned trip', async () => {
        // Reset trip to active for location testing (since completeTrip set it to completed)
        await db_1.db.update(schema_1.trips).set({ status: 'active' }).where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripA));
        try {
            await location_service_1.LocationService.assertConductorOwnsActiveTrip(tripA, conductorB);
            node_assert_1.default.fail('Should have thrown Forbidden error');
        }
        catch (err) {
            node_assert_1.default.strictEqual(err.statusCode, 403);
            node_assert_1.default.match(err.message, /not assigned/);
        }
        // Verify an audit log was created for the above failure
        const [log] = await db_1.db.select()
            .from(schema_1.auditLogs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.user_id, conductorB), (0, drizzle_orm_1.eq)(schema_1.auditLogs.action, 'UNAUTHORIZED_LOCATION_UPDATE_ATTEMPT')))
            .limit(1);
        node_assert_1.default.ok(log, 'Audit log should have been created');
        node_assert_1.default.strictEqual(log.entity_id, tripA);
    });
    await t.test('Cleanup: Remove test data', async () => {
        // Delete in order of dependencies
        const allUserIds = [operatorA, operatorB, conductorA, conductorB, admin];
        for (const uid of allUserIds) {
            if (uid)
                await db_1.db.delete(schema_1.auditLogs).where((0, drizzle_orm_1.eq)(schema_1.auditLogs.user_id, uid));
        }
        await db_1.db.delete(schema_1.trips).where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripA));
        await db_1.db.delete(schema_1.routes).where((0, drizzle_orm_1.eq)(schema_1.routes.id, routeA));
        for (const uid of allUserIds) {
            if (uid)
                await db_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, uid));
        }
        await db_1.db.delete(schema_1.agencies).where((0, drizzle_orm_1.eq)(schema_1.agencies.id, agencyA));
        await db_1.db.delete(schema_1.agencies).where((0, drizzle_orm_1.eq)(schema_1.agencies.id, agencyB));
        // Close DB connection to exit gracefully
        await db_1.sql.end();
    });
});
