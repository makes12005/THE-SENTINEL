"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
async function logAudit(userId, action, entityId, metadata) {
    await db_1.db.insert(schema_1.auditLogs).values({
        user_id: userId,
        action,
        entity_type: 'bus',
        entity_id: entityId,
        metadata,
    });
}
class BusService {
    static async listBuses(agencyId) {
        return db_1.db
            .select({
            id: schema_1.buses.id,
            agency_id: schema_1.buses.agency_id,
            number_plate: schema_1.buses.number_plate,
            model: schema_1.buses.model,
            capacity: schema_1.buses.capacity,
            is_active: schema_1.buses.is_active,
            added_by: schema_1.buses.added_by,
            added_by_name: schema_1.users.name,
            created_at: schema_1.buses.created_at,
        })
            .from(schema_1.buses)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.buses.added_by))
            .where((0, drizzle_orm_1.eq)(schema_1.buses.agency_id, agencyId))
            .orderBy(schema_1.buses.number_plate);
    }
    static async createBus(agencyId, addedBy, payload) {
        const plate = payload.number_plate.toUpperCase().trim();
        const [existing] = await db_1.db
            .select({ id: schema_1.buses.id })
            .from(schema_1.buses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.buses.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.buses.number_plate, plate)))
            .limit(1);
        if (existing) {
            throw Object.assign(new Error(`Bus ${plate} already exists in your agency`), { statusCode: 409, code: 'DUPLICATE_RESOURCE' });
        }
        const [bus] = await db_1.db
            .insert(schema_1.buses)
            .values({
            agency_id: agencyId,
            number_plate: plate,
            model: payload.model?.trim() || null,
            capacity: payload.capacity ?? null,
            is_active: true,
            added_by: addedBy,
        })
            .returning();
        await logAudit(addedBy, 'BUS_CREATED', bus.id, {
            agency_id: agencyId,
            number_plate: bus.number_plate,
        });
        return bus;
    }
    static async updateBus(busId, agencyId, userId, payload) {
        const [bus] = await db_1.db
            .select({ id: schema_1.buses.id, number_plate: schema_1.buses.number_plate })
            .from(schema_1.buses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.buses.id, busId), (0, drizzle_orm_1.eq)(schema_1.buses.agency_id, agencyId)))
            .limit(1);
        if (!bus) {
            throw Object.assign(new Error('Bus not found in your agency'), { statusCode: 404, code: 'BUS_NOT_FOUND' });
        }
        const updateData = {};
        if (payload.model !== undefined)
            updateData.model = payload.model?.trim() || null;
        if (payload.capacity !== undefined)
            updateData.capacity = payload.capacity ?? null;
        if (payload.is_active !== undefined)
            updateData.is_active = payload.is_active;
        if (Object.keys(updateData).length === 0) {
            throw Object.assign(new Error('No bus details were provided to update'), { statusCode: 400, code: 'NO_FIELDS' });
        }
        const [updated] = await db_1.db
            .update(schema_1.buses)
            .set(updateData)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.buses.id, busId), (0, drizzle_orm_1.eq)(schema_1.buses.agency_id, agencyId)))
            .returning();
        await logAudit(userId, 'BUS_UPDATED', busId, {
            agency_id: agencyId,
            number_plate: bus.number_plate,
            updates: updateData,
        });
        return updated;
    }
    static async deactivateBus(busId, agencyId, userId) {
        const [bus] = await db_1.db
            .select({ id: schema_1.buses.id, number_plate: schema_1.buses.number_plate, is_active: schema_1.buses.is_active })
            .from(schema_1.buses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.buses.id, busId), (0, drizzle_orm_1.eq)(schema_1.buses.agency_id, agencyId)))
            .limit(1);
        if (!bus) {
            throw Object.assign(new Error('Bus not found in your agency'), { statusCode: 404, code: 'BUS_NOT_FOUND' });
        }
        const [activeTrip] = await db_1.db
            .select({ id: schema_1.trips.id })
            .from(schema_1.trips)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.trips.bus_id, busId), (0, drizzle_orm_1.eq)(schema_1.trips.status, 'active')))
            .limit(1);
        if (activeTrip) {
            throw Object.assign(new Error('This bus is currently assigned to an active trip and cannot be deactivated'), { statusCode: 409, code: 'BUS_IN_ACTIVE_TRIP' });
        }
        const [updated] = await db_1.db
            .update(schema_1.buses)
            .set({ is_active: false })
            .where((0, drizzle_orm_1.eq)(schema_1.buses.id, busId))
            .returning();
        await logAudit(userId, 'BUS_DEACTIVATED', busId, {
            agency_id: agencyId,
            number_plate: bus.number_plate,
        });
        return updated;
    }
    static async countTripsForMember(memberId) {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      select count(*)::text as count
      from trips
      where conductor_id = ${memberId} or driver_id = ${memberId}
    `);
        return Number(result[0]?.count ?? 0);
    }
}
exports.BusService = BusService;
