import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { auditLogs, buses, trips, users } from '../../db/schema';
import { CreateBusRequest, UpdateBusRequest } from '../../lib/shared-types';

async function logAudit(userId: string, action: string, entityId: string, metadata?: Record<string, unknown>) {
  await db.insert(auditLogs).values({
    user_id: userId,
    action,
    entity_type: 'bus',
    entity_id: entityId,
    metadata,
  });
}

export class BusService {
  static async listBuses(agencyId: string) {
    return db
      .select({
        id: buses.id,
        agency_id: buses.agency_id,
        number_plate: buses.number_plate,
        model: buses.model,
        capacity: buses.capacity,
        is_active: buses.is_active,
        added_by: buses.added_by,
        added_by_name: users.name,
        created_at: buses.created_at,
      })
      .from(buses)
      .leftJoin(users, eq(users.id, buses.added_by))
      .where(eq(buses.agency_id, agencyId))
      .orderBy(buses.number_plate);
  }

  static async createBus(agencyId: string, addedBy: string, payload: CreateBusRequest) {
    const plate = payload.number_plate.toUpperCase().trim();

    const [existing] = await db
      .select({ id: buses.id })
      .from(buses)
      .where(and(eq(buses.agency_id, agencyId), eq(buses.number_plate, plate)))
      .limit(1);

    if (existing) {
      throw Object.assign(
        new Error(`Bus ${plate} already exists in your agency`),
        { statusCode: 409, code: 'DUPLICATE_RESOURCE' }
      );
    }

    const [bus] = await db
      .insert(buses)
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

  static async updateBus(busId: string, agencyId: string, userId: string, payload: UpdateBusRequest) {
    const [bus] = await db
      .select({ id: buses.id, number_plate: buses.number_plate })
      .from(buses)
      .where(and(eq(buses.id, busId), eq(buses.agency_id, agencyId)))
      .limit(1);

    if (!bus) {
      throw Object.assign(new Error('Bus not found in your agency'), { statusCode: 404, code: 'BUS_NOT_FOUND' });
    }

    const updateData: Partial<typeof buses.$inferInsert> = {};
    if (payload.model !== undefined) updateData.model = payload.model?.trim() || null;
    if (payload.capacity !== undefined) updateData.capacity = payload.capacity ?? null;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

    if (Object.keys(updateData).length === 0) {
      throw Object.assign(new Error('No bus details were provided to update'), { statusCode: 400, code: 'NO_FIELDS' });
    }

    const [updated] = await db
      .update(buses)
      .set(updateData)
      .where(and(eq(buses.id, busId), eq(buses.agency_id, agencyId)))
      .returning();

    await logAudit(userId, 'BUS_UPDATED', busId, {
      agency_id: agencyId,
      number_plate: bus.number_plate,
      updates: updateData,
    });

    return updated;
  }

  static async deactivateBus(busId: string, agencyId: string, userId: string) {
    const [bus] = await db
      .select({ id: buses.id, number_plate: buses.number_plate, is_active: buses.is_active })
      .from(buses)
      .where(and(eq(buses.id, busId), eq(buses.agency_id, agencyId)))
      .limit(1);

    if (!bus) {
      throw Object.assign(new Error('Bus not found in your agency'), { statusCode: 404, code: 'BUS_NOT_FOUND' });
    }

    const [activeTrip] = await db
      .select({ id: trips.id })
      .from(trips)
      .where(and(eq(trips.bus_id, busId), eq(trips.status, 'active')))
      .limit(1);

    if (activeTrip) {
      throw Object.assign(
        new Error('This bus is currently assigned to an active trip and cannot be deactivated'),
        { statusCode: 409, code: 'BUS_IN_ACTIVE_TRIP' }
      );
    }

    const [updated] = await db
      .update(buses)
      .set({ is_active: false })
      .where(eq(buses.id, busId))
      .returning();

    await logAudit(userId, 'BUS_DEACTIVATED', busId, {
      agency_id: agencyId,
      number_plate: bus.number_plate,
    });

    return updated;
  }

  static async countTripsForMember(memberId: string) {
    const result = await db.execute<{ count: string }>(sql`
      select count(*)::text as count
      from trips
      where conductor_id = ${memberId} or driver_id = ${memberId}
    `);
    return Number(result[0]?.count ?? 0);
  }
}
