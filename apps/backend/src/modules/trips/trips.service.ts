import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { agencyWallets, buses, conductorLocations, routes, tripPassengers, trips, users, stops, tripTemplates } from '../../db/schema';
import { AddPassengerRequest, BatchAddPassengersRequest, BoardingChecklistUpdateRequest, CreateTripRequest, TripStatus, TripStatusResponse, UserRole } from '../../lib/shared-types';
import { deductTripCredit } from '../wallet/wallet.service';
import { logForbiddenAccess } from './trip-auth.helper';
import { hasTripTemplateColumn } from './trip-template-column';

export class TripsService {
  static async createTrip(operatorId: string, agencyId: string, payload: CreateTripRequest) {
    // ── Template resolution ─────────────────────────────────────────────────
    // If template_id is provided, load the template and merge its fields into
    // the payload so the rest of the validation logic works unchanged.
    if (payload.template_id) {
      const [tmpl] = await db
        .select()
        .from(tripTemplates)
        .where(and(eq(tripTemplates.id, payload.template_id), eq(tripTemplates.agency_id, agencyId)))
        .limit(1);

      if (!tmpl) {
        throw Object.assign(new Error('Template not found or does not belong to your agency'), { statusCode: 404 });
      }

      // Merge template fields — caller can still override individual fields
      if (!payload.route_id) payload.route_id = tmpl.route_id;
      if (!payload.conductor_id && tmpl.conductor_id) payload.conductor_id = tmpl.conductor_id;
      if (!payload.driver_id && tmpl.driver_id) payload.driver_id = tmpl.driver_id;
      if (!payload.bus_id && tmpl.bus_id) payload.bus_id = tmpl.bus_id;
      if (!payload.scheduled_time && tmpl.departure_time) payload.scheduled_time = tmpl.departure_time;
    }

    const {
      route_id: routeId,
      conductor_id: conductorId,
      driver_id: driverId,
      bus_id: busId,
      assigned_operator_id: assignedOperatorId,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
    } = payload;

    if (!routeId || !conductorId) {
      throw Object.assign(
        new Error('route_id and conductor_id are required (either directly or via template)'),
        { statusCode: 400 }
      );
    }

    const [route] = await db
      .select({ id: routes.id, agency_id: routes.agency_id, name: routes.name })
      .from(routes)
      .where(eq(routes.id, routeId))
      .limit(1);

    if (!route) throw Object.assign(new Error('Route not found'), { statusCode: 404 });

    if (route.agency_id !== agencyId) throw Object.assign(new Error('Route does not belong to your agency'), { statusCode: 403 });
    const [wallet] = await db
      .select({ trips_remaining: agencyWallets.trips_remaining })
      .from(agencyWallets)
      .where(eq(agencyWallets.agency_id, agencyId))
      .limit(1);
    if ((wallet?.trips_remaining ?? 0) < 1) {
      throw Object.assign(new Error('No trips remaining. Contact your agency owner.'), {
        statusCode: 402,
        code: 'NO_TRIPS_REMAINING',
      });
    }

    const [conductor] = await db
      .select({ id: users.id, agency_id: users.agency_id, role: users.role, is_active: users.is_active })
      .from(users)
      .where(eq(users.id, conductorId))
      .limit(1);

    if (!conductor) throw Object.assign(new Error('Conductor not found'), { statusCode: 404 });
    if (conductor.agency_id !== agencyId || conductor.role !== 'conductor') {
      throw Object.assign(new Error('Conductor must belong to your agency'), { statusCode: 422 });
    }
    if (!conductor.is_active) throw Object.assign(new Error('Conductor is inactive'), { statusCode: 422 });

    if (driverId) {
      const [driver] = await db
        .select({ id: users.id, agency_id: users.agency_id, role: users.role, is_active: users.is_active })
        .from(users)
        .where(eq(users.id, driverId))
        .limit(1);

      if (!driver) throw Object.assign(new Error('Driver not found'), { statusCode: 404 });
      if (driver.agency_id !== agencyId || driver.role !== 'driver') {
        throw Object.assign(new Error('Driver must belong to your agency'), { statusCode: 422 });
      }
      if (!driver.is_active) throw Object.assign(new Error('Driver is inactive'), { statusCode: 422 });
    }

    if (busId) {
      const [bus] = await db
        .select({ id: buses.id, agency_id: buses.agency_id, is_active: buses.is_active })
        .from(buses)
        .where(eq(buses.id, busId))
        .limit(1);

      if (!bus) throw Object.assign(new Error('Bus not found'), { statusCode: 404 });
      if (bus.agency_id !== agencyId) throw Object.assign(new Error('Bus does not belong to your agency'), { statusCode: 403 });
      if (!bus.is_active) throw Object.assign(new Error('Bus must be active before it can be assigned'), { statusCode: 422 });
    }

    let finalAssignedOperatorId = operatorId;
    if (assignedOperatorId) {
      const [assignedOperator] = await db
        .select({ id: users.id, agency_id: users.agency_id, role: users.role, is_active: users.is_active })
        .from(users)
        .where(eq(users.id, assignedOperatorId))
        .limit(1);

      if (!assignedOperator) throw Object.assign(new Error('Assigned operator not found'), { statusCode: 404 });
      if (assignedOperator.agency_id !== agencyId || assignedOperator.role !== 'operator') {
        throw Object.assign(new Error('Assigned operator must belong to your agency'), { statusCode: 422 });
      }
      if (!assignedOperator.is_active) throw Object.assign(new Error('Assigned operator is inactive'), { statusCode: 422 });
      finalAssignedOperatorId = assignedOperatorId;
    }

    const tripValues: Record<string, unknown> = {
      route_id: routeId,
      owned_by_operator_id: operatorId,
      assigned_operator_id: finalAssignedOperatorId,
      conductor_id: conductorId,
      driver_id: driverId || null,
      bus_id: busId || null,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime || null,
      status: 'scheduled',
    };

    if (await hasTripTemplateColumn()) {
      tripValues.template_id = payload.template_id || null;
    }

    const [trip] = await db
      .insert(trips)
      .values(tripValues as typeof trips.$inferInsert)
      .returning();

    return trip;
  }

  static async listTrips(agencyId: string, userId: string, userRole: string, filters?: { status?: TripStatus; unassigned?: boolean }) {
    console.log(`[DEBUG] TripsService.listTrips - Agency: ${agencyId}, User: ${userId}, Role: ${userRole}, Filters: ${JSON.stringify(filters)}`);
    const conditions = [
      eq(routes.agency_id, agencyId),
      filters?.status ? eq(trips.status, filters.status) : sql`true`,
      filters?.unassigned ? sql`${trips.assigned_operator_id} is null` : sql`true`,
    ];

    if (userRole === UserRole.OPERATOR) {
      conditions.push(or(eq(trips.owned_by_operator_id, userId), eq(trips.assigned_operator_id, userId)) as any);
    } else if (userRole === UserRole.CONDUCTOR) {
      conditions.push(eq(trips.conductor_id, userId) as any);
    } else if (userRole === UserRole.DRIVER) {
      conditions.push(or(eq(trips.driver_id, userId), eq(trips.conductor_id, userId)) as any);
    }

    const data = await db
      .select({
        id: trips.id,
        status: trips.status,
        scheduled_date: trips.scheduled_date,
        started_at: trips.started_at,
        completed_at: trips.completed_at,
        created_at: trips.created_at,
        owned_by_operator_id: trips.owned_by_operator_id,
        assigned_operator_id: trips.assigned_operator_id,
        route: {
          name: routes.name,
          from_city: routes.from_city,
          to_city: routes.to_city,
        },
        conductor: {
          name: sql<string>`conductor.name`,
        },
        bus_number: buses.number_plate,
        owner_name: sql<string>`owner_user.name`,
        assigned_operator_name: sql<string>`assigned_operator.name`,
        passenger_count: sql<number>`count(${tripPassengers.id})::int`,
      })
      .from(trips)
      .innerJoin(routes, eq(routes.id, trips.route_id))
      .innerJoin(sql`users conductor`, sql`conductor.id = ${trips.conductor_id}`)
      .innerJoin(sql`users owner_user`, sql`owner_user.id = ${trips.owned_by_operator_id}`)
      .leftJoin(sql`users assigned_operator`, sql`assigned_operator.id = ${trips.assigned_operator_id}`)
      .leftJoin(buses, eq(buses.id, trips.bus_id))
      .leftJoin(tripPassengers, eq(tripPassengers.trip_id, trips.id))
      .where(and(...conditions))
      .groupBy(
        trips.id,
        routes.id,
        buses.id,
        sql`conductor.name`,
        sql`owner_user.name`,
        sql`assigned_operator.name`
      )
      .orderBy(desc(trips.scheduled_date), desc(trips.created_at));

    console.log(`[DEBUG] TripsService.listTrips - Found ${data.length} trips for user ${userId}`);
    if (data.length === 0) {
      console.log(`[DEBUG] TripsService.listTrips - No trips found. Possible cause: Mismatch in agency_id, role permissions, or assignment.`);
    }

    return data;
  }

  static async getTrip(tripId: string) {
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, tripId))
      .limit(1);

    if (!trip) throw Object.assign(new Error('Trip not found'), { statusCode: 404 });

    const [routeRow] = await db
      .select({
        name: routes.name,
        from_city: routes.from_city,
        to_city: routes.to_city,
      })
      .from(routes)
      .where(eq(routes.id, trip.route_id))
      .limit(1);

    const [conductorUser] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, trip.conductor_id))
      .limit(1);

    const driverUser = trip.driver_id
      ? (
          await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, trip.driver_id))
            .limit(1)
        )[0] ?? null
      : null;

    const assignedOp = trip.assigned_operator_id
      ? (
          await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, trip.assigned_operator_id))
            .limit(1)
        )[0] ?? null
      : null;

    const [ownerOperator] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, trip.owned_by_operator_id))
      .limit(1);

    const busRow = trip.bus_id
      ? (
          await db
            .select({ number_plate: buses.number_plate })
            .from(buses)
            .where(eq(buses.id, trip.bus_id))
            .limit(1)
        )[0] ?? null
      : null;

    const passengers = await db
      .select({
        id: tripPassengers.id,
        passenger_name: tripPassengers.passenger_name,
        passenger_phone: tripPassengers.passenger_phone,
        alert_status: tripPassengers.alert_status,
        alert_sent_at: tripPassengers.alert_sent_at,
      })
      .from(tripPassengers)
      .where(eq(tripPassengers.trip_id, tripId));

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

  static async listPassengers(tripId: string) {
    return db
      .select({
        id: tripPassengers.id,
        passenger_name: tripPassengers.passenger_name,
        passenger_phone: tripPassengers.passenger_phone,
        name: tripPassengers.passenger_name,
        phone: tripPassengers.passenger_phone,
        pickup_point: tripPassengers.pickup_point,
        seat_no: tripPassengers.seat_no,
        boarding_status: tripPassengers.boarding_status,
        boarded_at: tripPassengers.boarded_at,
        alert_status: tripPassengers.alert_status,
        alert_channel: tripPassengers.alert_channel,
        alert_sent_at: tripPassengers.alert_sent_at,
        created_at: tripPassengers.created_at,
        stop_name: stops.name,
        stop_sequence: stops.sequence_number,
        stop_latitude: sql<number>`ST_Y(${stops.coordinates}::geometry)`,
        stop_longitude: sql<number>`ST_X(${stops.coordinates}::geometry)`,
      })
      .from(tripPassengers)
      .innerJoin(stops, eq(stops.id, tripPassengers.stop_id))
      .where(eq(tripPassengers.trip_id, tripId))
      .orderBy(stops.sequence_number, tripPassengers.created_at);
  }

  static async getTripStatus(tripId: string): Promise<TripStatusResponse> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
    if (!trip) throw Object.assign(new Error('Trip not found'), { statusCode: 404 });

    const locationResult = Array.from(await db.execute<{
      lat: number;
      lng: number;
      recorded_at: string;
      battery_level: string | null;
      accuracy_meters: string | null;
    }>(sql`
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

    const summaryResult = Array.from(await db.execute<{
      total: string;
      pending: string;
      sent: string;
      failed: string;
    }>(sql`
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
      status: trip.status as TripStatus,
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

  static async startTrip(
    tripId: string,
    conductorId: string,
    checklist?: BoardingChecklistUpdateRequest['passengers']
  ) {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
    if (!trip) throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
    if (trip.conductor_id !== conductorId) {
      await logForbiddenAccess(conductorId, tripId, 'UNAUTHORIZED_TRIP_START_ATTEMPT', {
        reason: 'Conductor not assigned to trip',
        assigned_conductor_id: trip.conductor_id,
      });
      throw Object.assign(new Error('You are not assigned as conductor of this trip'), { statusCode: 403, code: 'FORBIDDEN' });
    }
    if (trip.status !== 'scheduled') throw Object.assign(new Error(`Cannot start a trip with status: ${trip.status}`), { statusCode: 409 });

    if (checklist && checklist.length > 0) {
      const passengerIds = checklist.map((item: BoardingChecklistUpdateRequest['passengers'][number]) => item.id);
      const existingPassengers = await db
        .select({ id: tripPassengers.id })
        .from(tripPassengers)
        .where(and(eq(tripPassengers.trip_id, tripId), sql`${tripPassengers.id} = any(${passengerIds})`));

      const existingIds = new Set(existingPassengers.map((row) => row.id));
      const invalidId = checklist.find((item: BoardingChecklistUpdateRequest['passengers'][number]) => !existingIds.has(item.id));
      if (invalidId) {
        throw Object.assign(new Error('Checklist contains passengers from another trip'), {
          statusCode: 400,
          code: 'INVALID_BOARDING_CHECKLIST',
        });
      }

      for (const item of checklist) {
        await db
          .update(tripPassengers)
          .set({
            boarding_status: item.boarding_status,
            boarded_at: item.boarding_status === 'boarded' ? new Date() : null,
          })
          .where(eq(tripPassengers.id, item.id));
      }
    }

    const [updated] = await db.update(trips).set({ status: 'active', started_at: new Date() }).where(eq(trips.id, tripId)).returning();
    return updated;
  }

  static async completeTrip(tripId: string, conductorId: string) {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
    if (!trip) throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
    if (trip.conductor_id !== conductorId) {
      await logForbiddenAccess(conductorId, tripId, 'UNAUTHORIZED_TRIP_COMPLETE_ATTEMPT', {
        reason: 'Conductor not assigned to trip',
        assigned_conductor_id: trip.conductor_id,
      });
      throw Object.assign(new Error('You are not assigned as conductor of this trip'), { statusCode: 403, code: 'FORBIDDEN' });
    }
    if (trip.status !== 'active') throw Object.assign(new Error(`Cannot complete a trip with status: ${trip.status}`), { statusCode: 409 });

    const [updated] = await db.update(trips).set({ status: 'completed', completed_at: new Date() }).where(eq(trips.id, tripId)).returning();

    setImmediate(async () => {
      try {
        const [route] = await db.select({ agency_id: routes.agency_id }).from(routes).where(eq(routes.id, trip.route_id)).limit(1);
        if (route?.agency_id) await deductTripCredit(route.agency_id, tripId);
      } catch (walletErr) {
        console.error('[Wallet] Failed to deduct trip credit for trip', tripId, walletErr);
      }
    });

    return updated;
  }

  static async addPassenger(tripId: string, payload: AddPassengerRequest) {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
    if (!trip) throw Object.assign(new Error('Trip not found'), { statusCode: 404 });

    const [passenger] = await db
      .insert(tripPassengers)
      .values({
        trip_id: tripId,
        passenger_name: payload.passenger_name,
        passenger_phone: payload.passenger_phone,
        stop_id: payload.stop_id,
        pickup_point: payload.pickup_point ?? null,
        seat_no: payload.seat_no ?? null,
        alert_status: 'pending',
        boarding_status: 'pending',
      })
      .returning();

    return passenger;
  }

  static async batchAddPassengers(tripId: string, payload: BatchAddPassengersRequest) {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
    if (!trip) throw Object.assign(new Error('Trip not found'), { statusCode: 404 });

    if (payload.passengers.length === 0) return [];

    const passengers = await db.transaction(async (tx) => {
      return tx
        .insert(tripPassengers)
        .values(
          payload.passengers.map((p) => ({
            trip_id: tripId,
            passenger_name: p.passenger_name,
            passenger_phone: p.passenger_phone,
            stop_id: p.stop_id,
            pickup_point: p.pickup_point ?? null,
            seat_no: p.seat_no ?? null,
            alert_status: 'pending' as const,
            boarding_status: 'pending' as const,
          }))
        )
        .returning();
    });

    return passengers;
  }

  static async getCurrentLocation(tripId: string) {
    const rows = Array.from(await db.execute<{
      recorded_at: string;
      battery_level: string | null;
      accuracy_meters: string | null;
      lat: number;
      lng: number;
    }>(sql`
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
    if (!row) return null;

    return {
      lat: Number(row.lat),
      lng: Number(row.lng),
      recorded_at: row.recorded_at,
      battery_level: row.battery_level ? Number(row.battery_level) : null,
      accuracy_meters: row.accuracy_meters ? Number(row.accuracy_meters) : null,
    };
  }
}
