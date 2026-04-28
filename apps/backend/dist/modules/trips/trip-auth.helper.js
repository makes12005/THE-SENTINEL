"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logForbiddenAccess = logForbiddenAccess;
exports.verifyTripAgency = verifyTripAgency;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const shared_types_1 = require("../../lib/shared-types");
/**
 * Logs a forbidden access attempt to the audit logs.
 */
async function logForbiddenAccess(userId, tripId, action, metadata = {}) {
    await db_1.db.insert(schema_1.auditLogs).values({
        user_id: userId,
        action,
        entity_type: 'trip',
        entity_id: tripId,
        metadata: {
            ...metadata,
            timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        },
    });
}
/**
 * Security helper to verify that a trip belongs to a specific agency.
 * Admin role bypasses this check and can access any trip.
 *
 * @throws 403 Forbidden if access is denied
 * @returns The trip object if access is granted
 */
async function verifyTripAgency(tripId, agencyId, userId, userRole) {
    // 1. Admin bypass
    if (userRole === shared_types_1.UserRole.ADMIN) {
        const [trip] = await db_1.db
            .select()
            .from(schema_1.trips)
            .where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId))
            .limit(1);
        if (!trip) {
            throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
        }
        return trip;
    }
    // 2. Agency check via Join
    const [result] = await db_1.db
        .select({
        trip: schema_1.trips,
        agency_id: schema_1.routes.agency_id
    })
        .from(schema_1.trips)
        .innerJoin(schema_1.routes, (0, drizzle_orm_1.eq)(schema_1.trips.route_id, schema_1.routes.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId), (0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId)))
        .limit(1);
    if (!result) {
        // Log unauthorized access attempt
        await logForbiddenAccess(userId, tripId, 'UNAUTHORIZED_TRIP_ACCESS_ATTEMPT', {
            attempted_agency_id: agencyId,
            user_role: userRole,
        });
        throw Object.assign(new Error('You do not have access to this trip'), {
            statusCode: 403,
            code: 'FORBIDDEN'
        });
    }
    return result.trip;
}
