"use strict";
/**
 * Takeover Service — Sprint 6
 *
 * PUT /api/trips/:id/takeover
 * - Driver role only
 * - Driver must belong to the same agency as the trip
 * - Sets trip.conductor_id = driver's userId (driver takes over conductor role)
 * - Emits Socket.IO: conductor_replaced to all trip participants
 * - Logs to audit_logs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TakeoverService = void 0;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const socket_1 = require("../../lib/socket");
class TakeoverService {
    static async takeoverTrip(tripId, driverId, fastify) {
        // 1. Load the trip
        const [trip] = await db_1.db
            .select()
            .from(schema_1.trips)
            .where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId))
            .limit(1);
        if (!trip) {
            throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
        }
        // 2. Trip must be active to be taken over
        if (trip.status !== 'active') {
            throw Object.assign(new Error('Trip is not active — takeover only allowed during an active trip'), { statusCode: 409 });
        }
        // 3. Load driver — verify agency match with trip
        const [driver] = await db_1.db
            .select({ id: schema_1.users.id, name: schema_1.users.name, agency_id: schema_1.users.agency_id, role: schema_1.users.role })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, driverId))
            .limit(1);
        if (!driver) {
            throw Object.assign(new Error('Driver not found'), { statusCode: 404 });
        }
        if (driver.role !== 'driver') {
            throw Object.assign(new Error('Only users with driver role can take over a trip'), { statusCode: 403 });
        }
        // 4. Verify driver belongs to same agency as the trip owner
        const [tripOperator] = await db_1.db
            .select({ agency_id: schema_1.users.agency_id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, trip.owned_by_operator_id))
            .limit(1);
        if (tripOperator && tripOperator.agency_id !== driver.agency_id) {
            throw Object.assign(new Error('Driver does not belong to the same agency as this trip'), { statusCode: 403 });
        }
        // 5. Persist: set conductor_id = driver's userId
        const previousConductorId = trip.conductor_id;
        const [updatedTrip] = await db_1.db
            .update(schema_1.trips)
            .set({ conductor_id: driverId })
            .where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId))
            .returning();
        // 6. Audit log
        await db_1.db.insert(schema_1.auditLogs).values({
            user_id: driverId,
            action: 'TRIP_TAKEOVER',
            entity_type: 'trip',
            entity_id: tripId,
            metadata: {
                previous_conductor_id: previousConductorId,
                driver_id: driverId,
                driver_name: driver.name,
                timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            },
        });
        // 7. Emit Socket.IO to all trip participants
        try {
            await (0, socket_1.emitSocketEvent)(`trip:${tripId}`, 'conductor_replaced', {
                tripId,
                newConductorId: driverId,
                newConductorName: driver.name,
                previousConductorId,
                takenOverAt: new Date().toISOString(),
            });
        }
        catch (e) {
            fastify.log.warn(`[Takeover] Socket emit failed for trip ${tripId}: ${e}`);
        }
        return {
            trip: updatedTrip,
            driver: {
                id: driver.id,
                name: driver.name,
            },
            previousConductorId,
            message: 'Takeover successful. Driver now has conductor permissions for this trip.',
        };
    }
}
exports.TakeoverService = TakeoverService;
