"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOperatorDeactivation = handleOperatorDeactivation;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const socket_1 = require("../../lib/socket");
async function handleOperatorDeactivation(operatorId, agencyId, actorId) {
    const [operator] = await db_1.db
        .select({ id: schema_1.users.id, name: schema_1.users.name })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, operatorId), (0, drizzle_orm_1.eq)(schema_1.users.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.users.role, 'operator')))
        .limit(1);
    if (!operator) {
        return { orphaned_trip_ids: [], operator_name: '' };
    }
    const orphanedTrips = await db_1.db
        .select({
        id: schema_1.trips.id,
        route_name: schema_1.routes.name,
        scheduled_date: schema_1.trips.scheduled_date,
    })
        .from(schema_1.trips)
        .innerJoin(schema_1.routes, (0, drizzle_orm_1.eq)(schema_1.routes.id, schema_1.trips.route_id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.trips.assigned_operator_id, operatorId), (0, drizzle_orm_1.ne)(schema_1.trips.status, 'completed')));
    if (orphanedTrips.length === 0) {
        return { orphaned_trip_ids: [], operator_name: operator.name };
    }
    const orphanedIds = orphanedTrips.map((trip) => trip.id);
    await db_1.db
        .update(schema_1.trips)
        .set({ assigned_operator_id: null })
        .where((0, drizzle_orm_1.inArray)(schema_1.trips.id, orphanedIds));
    await db_1.db.insert(schema_1.auditLogs).values(orphanedTrips.map((trip) => ({
        user_id: actorId,
        action: 'TRIP_UNASSIGNED',
        entity_type: 'trip',
        entity_id: trip.id,
        metadata: {
            agency_id: agencyId,
            previous_operator_id: operatorId,
            previous_operator_name: operator.name,
        },
    })));
    for (const trip of orphanedTrips) {
        await (0, socket_1.emitSocketEvent)(`agency:${agencyId}`, 'trip_unassigned', {
            tripId: trip.id,
            tripName: trip.route_name,
            previousOperatorName: operator.name,
        });
    }
    return {
        orphaned_trip_ids: orphanedIds,
        operator_name: operator.name,
    };
}
