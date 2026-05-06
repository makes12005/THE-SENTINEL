"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripsService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const shared_types_1 = require("../../lib/shared-types");
const wallet_service_1 = require("../wallet/wallet.service");
const trip_auth_helper_1 = require("./trip-auth.helper");
class TripsService {
    static async createTrip(operatorId, agencyId, payload) {
        // ── Template resolution ─────────────────────────────────────────────────
        // If template_id is provided, load the template and merge its fields into
        // the payload so the rest of the validation logic works unchanged.
        if (payload.template_id) {
            const [tmpl] = await db_1.db
                .select()
                .from(schema_1.tripTemplates)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tripTemplates.id, payload.template_id), (0, drizzle_orm_1.eq)(schema_1.tripTemplates.agency_id, agencyId)))
                .limit(1);
            if (!tmpl) {
                throw Object.assign(new Error('Template not found or does not belong to your agency'), { statusCode: 404 });
            }
            // Merge template fields — caller can still override individual fields
            if (!payload.route_id)
                payload.route_id = tmpl.route_id;
            if (!payload.conductor_id && tmpl.conductor_id)
                payload.conductor_id = tmpl.conductor_id;
            if (!payload.driver_id && tmpl.driver_id)
                payload.driver_id = tmpl.driver_id;
            if (!payload.bus_id && tmpl.bus_id)
                payload.bus_id = tmpl.bus_id;
            if (!payload.scheduled_time && tmpl.departure_time)
                payload.scheduled_time = tmpl.departure_time;
        }
        const { route_id: routeId, conductor_id: conductorId, driver_id: driverId, bus_id: busId, assigned_operator_id: assignedOperatorId, scheduled_date: scheduledDate, scheduled_time: scheduledTime, } = payload;
        if (!routeId || !conductorId) {
            throw Object.assign(new Error('route_id and conductor_id are required (either directly or via template)'), { statusCode: 400 });
        }
        const [route] = await db_1.db
            .select({ id: schema_1.routes.id, agency_id: schema_1.routes.agency_id, name: schema_1.routes.name })
            .from(schema_1.routes)
            .where((0, drizzle_orm_1.eq)(schema_1.routes.id, routeId))
            .limit(1);
        if (!route)
            throw Object.assign(new Error('Route not found'), { statusCode: 404 });
        if (route.agency_id !== agencyId)
            throw Object.assign(new Error('Route does not belong to your agency'), { statusCode: 403 });
        const [wallet] = await db_1.db
            .select({ trips_remaining: schema_1.agencyWallets.trips_remaining })
            .from(schema_1.agencyWallets)
            .where((0, drizzle_orm_1.eq)(schema_1.agencyWallets.agency_id, agencyId))
            .limit(1);
        if ((wallet?.trips_remaining ?? 0) < 1) {
            throw Object.assign(new Error('No trips remaining. Contact your agency owner.'), {
                statusCode: 402,
                code: 'NO_TRIPS_REMAINING',
            });
        }
        const [conductor] = await db_1.db
            .select({ id: schema_1.users.id, agency_id: schema_1.users.agency_id, role: schema_1.users.role, is_active: schema_1.users.is_active })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, conductorId))
            .limit(1);
        if (!conductor)
            throw Object.assign(new Error('Conductor not found'), { statusCode: 404 });
        if (conductor.agency_id !== agencyId || conductor.role !== 'conductor') {
            throw Object.assign(new Error('Conductor must belong to your agency'), { statusCode: 422 });
        }
        if (!conductor.is_active)
            throw Object.assign(new Error('Conductor is inactive'), { statusCode: 422 });
        if (driverId) {
            const [driver] = await db_1.db
                .select({ id: schema_1.users.id, agency_id: schema_1.users.agency_id, role: schema_1.users.role, is_active: schema_1.users.is_active })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, driverId))
                .limit(1);
            if (!driver)
                throw Object.assign(new Error('Driver not found'), { statusCode: 404 });
            if (driver.agency_id !== agencyId || driver.role !== 'driver') {
                throw Object.assign(new Error('Driver must belong to your agency'), { statusCode: 422 });
            }
            if (!driver.is_active)
                throw Object.assign(new Error('Driver is inactive'), { statusCode: 422 });
        }
        if (busId) {
            const [bus] = await db_1.db
                .select({ id: schema_1.buses.id, agency_id: schema_1.buses.agency_id, is_active: schema_1.buses.is_active })
                .from(schema_1.buses)
                .where((0, drizzle_orm_1.eq)(schema_1.buses.id, busId))
                .limit(1);
            if (!bus)
                throw Object.assign(new Error('Bus not found'), { statusCode: 404 });
            if (bus.agency_id !== agencyId)
                throw Object.assign(new Error('Bus does not belong to your agency'), { statusCode: 403 });
            if (!bus.is_active)
                throw Object.assign(new Error('Bus must be active before it can be assigned'), { statusCode: 422 });
        }
        let finalAssignedOperatorId = operatorId;
        if (assignedOperatorId) {
            const [assignedOperator] = await db_1.db
                .select({ id: schema_1.users.id, agency_id: schema_1.users.agency_id, role: schema_1.users.role, is_active: schema_1.users.is_active })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, assignedOperatorId))
                .limit(1);
            if (!assignedOperator)
                throw Object.assign(new Error('Assigned operator not found'), { statusCode: 404 });
            if (assignedOperator.agency_id !== agencyId || assignedOperator.role !== 'operator') {
                throw Object.assign(new Error('Assigned operator must belong to your agency'), { statusCode: 422 });
            }
            if (!assignedOperator.is_active)
                throw Object.assign(new Error('Assigned operator is inactive'), { statusCode: 422 });
            finalAssignedOperatorId = assignedOperatorId;
        }
        const [trip] = await db_1.db
            .insert(schema_1.trips)
            .values({
            template_id: payload.template_id || null,
            route_id: routeId,
            owned_by_operator_id: operatorId,
            assigned_operator_id: finalAssignedOperatorId,
            conductor_id: conductorId,
            driver_id: driverId || null,
            bus_id: busId || null,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime || null,
            status: 'scheduled',
        })
            .returning();
        return trip;
    }
    static async listTrips(agencyId, userId, userRole, filters) {
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId),
            filters?.status ? (0, drizzle_orm_1.eq)(schema_1.trips.status, filters.status) : (0, drizzle_orm_1.sql) `true`,
            filters?.unassigned ? (0, drizzle_orm_1.sql) `${schema_1.trips.assigned_operator_id} is null` : (0, drizzle_orm_1.sql) `true`,
        ];
        if (userRole === shared_types_1.UserRole.OPERATOR) {
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.trips.owned_by_operator_id, userId), (0, drizzle_orm_1.eq)(schema_1.trips.assigned_operator_id, userId)));
        }
        return db_1.db
            .select({
            id: schema_1.trips.id,
            status: schema_1.trips.status,
            scheduled_date: schema_1.trips.scheduled_date,
            started_at: schema_1.trips.started_at,
            completed_at: schema_1.trips.completed_at,
            created_at: schema_1.trips.created_at,
            owned_by_operator_id: schema_1.trips.owned_by_operator_id,
            assigned_operator_id: schema_1.trips.assigned_operator_id,
            route: {
                name: schema_1.routes.name,
                from_city: schema_1.routes.from_city,
                to_city: schema_1.routes.to_city,
            },
            conductor: {
                name: (0, drizzle_orm_1.sql) `conductor.name`,
            },
            bus_number: schema_1.buses.number_plate,
            owner_name: (0, drizzle_orm_1.sql) `owner_user.name`,
            assigned_operator_name: (0, drizzle_orm_1.sql) `assigned_operator.name`,
            passenger_count: (0, drizzle_orm_1.sql) `count(${schema_1.tripPassengers.id})::int`,
        })
            .from(schema_1.trips)
            .innerJoin(schema_1.routes, (0, drizzle_orm_1.eq)(schema_1.routes.id, schema_1.trips.route_id))
            .innerJoin((0, drizzle_orm_1.sql) `users conductor`, (0, drizzle_orm_1.sql) `conductor.id = ${schema_1.trips.conductor_id}`)
            .innerJoin((0, drizzle_orm_1.sql) `users owner_user`, (0, drizzle_orm_1.sql) `owner_user.id = ${schema_1.trips.owned_by_operator_id}`)
            .leftJoin((0, drizzle_orm_1.sql) `users assigned_operator`, (0, drizzle_orm_1.sql) `assigned_operator.id = ${schema_1.trips.assigned_operator_id}`)
            .leftJoin(schema_1.buses, (0, drizzle_orm_1.eq)(schema_1.buses.id, schema_1.trips.bus_id))
            .leftJoin(schema_1.tripPassengers, (0, drizzle_orm_1.eq)(schema_1.tripPassengers.trip_id, schema_1.trips.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .groupBy(schema_1.trips.id, schema_1.routes.id, schema_1.buses.id, (0, drizzle_orm_1.sql) `conductor.name`, (0, drizzle_orm_1.sql) `owner_user.name`, (0, drizzle_orm_1.sql) `assigned_operator.name`)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.trips.scheduled_date), (0, drizzle_orm_1.desc)(schema_1.trips.created_at));
    }
    static async getTrip(tripId) {
        const [trip] = await db_1.db
            .select()
            .from(schema_1.trips)
            .where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId))
            .limit(1);
        if (!trip)
            throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
        const [routeRow] = await db_1.db
            .select({
            name: schema_1.routes.name,
            from_city: schema_1.routes.from_city,
            to_city: schema_1.routes.to_city,
        })
            .from(schema_1.routes)
            .where((0, drizzle_orm_1.eq)(schema_1.routes.id, trip.route_id))
            .limit(1);
        const [conductorUser] = await db_1.db
            .select({ id: schema_1.users.id, name: schema_1.users.name })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, trip.conductor_id))
            .limit(1);
        const driverUser = trip.driver_id
            ? (await db_1.db
                .select({ id: schema_1.users.id, name: schema_1.users.name })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, trip.driver_id))
                .limit(1))[0] ?? null
            : null;
        const assignedOp = trip.assigned_operator_id
            ? (await db_1.db
                .select({ id: schema_1.users.id, name: schema_1.users.name })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, trip.assigned_operator_id))
                .limit(1))[0] ?? null
            : null;
        const [ownerOperator] = await db_1.db
            .select({ id: schema_1.users.id, name: schema_1.users.name })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, trip.owned_by_operator_id))
            .limit(1);
        const busRow = trip.bus_id
            ? (await db_1.db
                .select({ number_plate: schema_1.buses.number_plate })
                .from(schema_1.buses)
                .where((0, drizzle_orm_1.eq)(schema_1.buses.id, trip.bus_id))
                .limit(1))[0] ?? null
            : null;
        const passengers = await db_1.db
            .select({
            id: schema_1.tripPassengers.id,
            passenger_name: schema_1.tripPassengers.passenger_name,
            passenger_phone: schema_1.tripPassengers.passenger_phone,
            alert_status: schema_1.tripPassengers.alert_status,
            alert_sent_at: schema_1.tripPassengers.alert_sent_at,
        })
            .from(schema_1.tripPassengers)
            .where((0, drizzle_orm_1.eq)(schema_1.tripPassengers.trip_id, tripId));
        return {
            ...trip,
            route: routeRow ?? { name: '', from_city: '', to_city: '' },
            conductor: conductorUser ?? { id: trip.conductor_id, name: '' },
            driver: driverUser,
            assigned_operator: assignedOp,
            trip_owner_operator: ownerOperator ?? { id: trip.owned_by_operator_id, name: '' },
            bus_number_plate: busRow?.number_plate ?? null,
            passengers,
        };
    }
    static async listPassengers(tripId) {
        return db_1.db
            .select({
            id: schema_1.tripPassengers.id,
            passenger_name: schema_1.tripPassengers.passenger_name,
            passenger_phone: schema_1.tripPassengers.passenger_phone,
            alert_status: schema_1.tripPassengers.alert_status,
            alert_channel: schema_1.tripPassengers.alert_channel,
            alert_sent_at: schema_1.tripPassengers.alert_sent_at,
            created_at: schema_1.tripPassengers.created_at,
        })
            .from(schema_1.tripPassengers)
            .where((0, drizzle_orm_1.eq)(schema_1.tripPassengers.trip_id, tripId))
            .orderBy(schema_1.tripPassengers.created_at);
    }
    static async getTripStatus(tripId) {
        const [trip] = await db_1.db.select().from(schema_1.trips).where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId)).limit(1);
        if (!trip)
            throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
        const locationResult = Array.from(await db_1.db.execute((0, drizzle_orm_1.sql) `
      select
        ST_Y(coordinates::geometry) as lat,
        ST_X(coordinates::geometry) as lng,
        recorded_at at time zone 'Asia/Kolkata' as recorded_at,
        battery_level,
        accuracy_meters
      from conductor_locations
      where trip_id = ${tripId}
      order by recorded_at desc
      limit 1
    `));
        const summaryResult = Array.from(await db_1.db.execute((0, drizzle_orm_1.sql) `
      select
        count(*) as total,
        count(*) filter (where alert_status = 'pending') as pending,
        count(*) filter (where alert_status = 'sent') as sent,
        count(*) filter (where alert_status = 'failed') as failed
      from trip_passengers
      where trip_id = ${tripId}
    `));
        const location = locationResult[0];
        const summary = summaryResult[0] ?? { total: '0', pending: '0', sent: '0', failed: '0' };
        return {
            id: trip.id,
            status: trip.status,
            scheduled_date: trip.scheduled_date,
            scheduled_time: trip.scheduled_time,
            started_at: trip.started_at ? trip.started_at.toISOString() : null,
            completed_at: trip.completed_at ? trip.completed_at.toISOString() : null,
            current_location: location
                ? {
                    lat: Number(location.lat),
                    lng: Number(location.lng),
                    recorded_at: String(location.recorded_at),
                    battery_level: location.battery_level ? Number(location.battery_level) : null,
                    accuracy_meters: location.accuracy_meters ? Number(location.accuracy_meters) : null,
                }
                : null,
            passengers: {
                total: Number(summary.total),
                pending: Number(summary.pending),
                sent: Number(summary.sent),
                failed: Number(summary.failed),
            },
            passenger_summary: {
                total: Number(summary.total),
                pending: Number(summary.pending),
                sent: Number(summary.sent),
                failed: Number(summary.failed),
            },
        };
    }
    static async startTrip(tripId, conductorId) {
        const [trip] = await db_1.db.select().from(schema_1.trips).where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId)).limit(1);
        if (!trip)
            throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
        if (trip.conductor_id !== conductorId) {
            await (0, trip_auth_helper_1.logForbiddenAccess)(conductorId, tripId, 'UNAUTHORIZED_TRIP_START_ATTEMPT', {
                reason: 'Conductor not assigned to trip',
                assigned_conductor_id: trip.conductor_id,
            });
            throw Object.assign(new Error('You are not assigned as conductor of this trip'), { statusCode: 403, code: 'FORBIDDEN' });
        }
        if (trip.status !== 'scheduled')
            throw Object.assign(new Error(`Cannot start a trip with status: ${trip.status}`), { statusCode: 409 });
        const [updated] = await db_1.db.update(schema_1.trips).set({ status: 'active', started_at: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId)).returning();
        return updated;
    }
    static async completeTrip(tripId, conductorId) {
        const [trip] = await db_1.db.select().from(schema_1.trips).where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId)).limit(1);
        if (!trip)
            throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
        if (trip.conductor_id !== conductorId) {
            await (0, trip_auth_helper_1.logForbiddenAccess)(conductorId, tripId, 'UNAUTHORIZED_TRIP_COMPLETE_ATTEMPT', {
                reason: 'Conductor not assigned to trip',
                assigned_conductor_id: trip.conductor_id,
            });
            throw Object.assign(new Error('You are not assigned as conductor of this trip'), { statusCode: 403, code: 'FORBIDDEN' });
        }
        if (trip.status !== 'active')
            throw Object.assign(new Error(`Cannot complete a trip with status: ${trip.status}`), { statusCode: 409 });
        const [updated] = await db_1.db.update(schema_1.trips).set({ status: 'completed', completed_at: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId)).returning();
        setImmediate(async () => {
            try {
                const [route] = await db_1.db.select({ agency_id: schema_1.routes.agency_id }).from(schema_1.routes).where((0, drizzle_orm_1.eq)(schema_1.routes.id, trip.route_id)).limit(1);
                if (route?.agency_id)
                    await (0, wallet_service_1.deductTripCredit)(route.agency_id, tripId);
            }
            catch (walletErr) {
                console.error('[Wallet] Failed to deduct trip credit for trip', tripId, walletErr);
            }
        });
        return updated;
    }
    static async addPassenger(tripId, payload) {
        const [trip] = await db_1.db.select().from(schema_1.trips).where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId)).limit(1);
        if (!trip)
            throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
        const [passenger] = await db_1.db
            .insert(schema_1.tripPassengers)
            .values({
            trip_id: tripId,
            passenger_name: payload.passenger_name,
            passenger_phone: payload.passenger_phone,
            stop_id: payload.stop_id,
            alert_status: 'pending',
        })
            .returning();
        return passenger;
    }
    static async batchAddPassengers(tripId, payload) {
        const [trip] = await db_1.db.select().from(schema_1.trips).where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId)).limit(1);
        if (!trip)
            throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
        if (payload.passengers.length === 0)
            return [];
        const passengers = await db_1.db.transaction(async (tx) => {
            return tx
                .insert(schema_1.tripPassengers)
                .values(payload.passengers.map((p) => ({
                trip_id: tripId,
                passenger_name: p.passenger_name,
                passenger_phone: p.passenger_phone,
                stop_id: p.stop_id,
                alert_status: 'pending',
            })))
                .returning();
        });
        return passengers;
    }
    static async getCurrentLocation(tripId) {
        const rows = Array.from(await db_1.db.execute((0, drizzle_orm_1.sql) `
      select
        recorded_at at time zone 'Asia/Kolkata' as recorded_at,
        battery_level,
        accuracy_meters,
        ST_Y(coordinates::geometry) as lat,
        ST_X(coordinates::geometry) as lng
      from conductor_locations
      where trip_id = ${tripId}
      order by recorded_at desc
      limit 1
    `));
        const row = rows[0];
        if (!row)
            return null;
        return {
            lat: Number(row.lat),
            lng: Number(row.lng),
            recorded_at: row.recorded_at,
            battery_level: row.battery_level ? Number(row.battery_level) : null,
            accuracy_meters: row.accuracy_meters ? Number(row.accuracy_meters) : null,
        };
    }
}
exports.TripsService = TripsService;
