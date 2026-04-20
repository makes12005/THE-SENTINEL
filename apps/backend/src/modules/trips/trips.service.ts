import { db } from '../../db';
import { trips, routes, stops, tripPassengers, users, conductorLocations } from '../../db/schema';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import { CreateTripRequest, AddPassengerRequest, TripStatus, TripStatusResponse } from '@busalert/shared-types';
import { deductAlertCost } from '../billing/billing.service';



export class TripsService {
  // ──────────────────────────────────────────────────────────
  // Create Trip (operator | admin) — with agency validation
  // ──────────────────────────────────────────────────────────
  static async createTrip(
    operatorId: string,
    agencyId: string,
    payload: CreateTripRequest
  ) {
    // Validate route belongs to operator's agency
    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, payload.route_id))
      .limit(1);

    if (!route) throw Object.assign(new Error('Route not found'), { statusCode: 404 });
    if (route.agency_id !== agencyId)
      throw Object.assign(new Error('Route does not belong to your agency'), { statusCode: 403 });

    // Validate conductor belongs to same agency
    const [conductor] = await db
      .select({ id: users.id, agency_id: users.agency_id, role: users.role })
      .from(users)
      .where(eq(users.id, payload.conductor_id))
      .limit(1);

    if (!conductor) throw Object.assign(new Error('Conductor not found'), { statusCode: 404 });
    if (conductor.agency_id !== agencyId)
      throw Object.assign(new Error('Conductor does not belong to your agency'), { statusCode: 403 });
    if (conductor.role !== 'conductor')
      throw Object.assign(new Error('Assigned user is not a conductor'), { statusCode: 422 });

    // Validate driver (optional) belongs to same agency
    if (payload.driver_id) {
      const [driver] = await db
        .select({ id: users.id, agency_id: users.agency_id, role: users.role })
        .from(users)
        .where(eq(users.id, payload.driver_id))
        .limit(1);

      if (!driver) throw Object.assign(new Error('Driver not found'), { statusCode: 404 });
      if (driver.agency_id !== agencyId)
        throw Object.assign(new Error('Driver does not belong to your agency'), { statusCode: 403 });
      if (driver.role !== 'driver')
        throw Object.assign(new Error('Assigned user is not a driver'), { statusCode: 422 });
    }

    const [trip] = await db
      .insert(trips)
      .values({
        route_id: payload.route_id,
        operator_id: operatorId,
        conductor_id: payload.conductor_id,
        driver_id: payload.driver_id ?? null,
        scheduled_date: payload.scheduled_date,
        status: 'scheduled',
        created_at: new Date(),
      })
      .returning();

    return trip;
  }

  // ──────────────────────────────────────────────────────────
  // List Trips for agency, optionally filtered by status
  // ──────────────────────────────────────────────────────────
  static async listTrips(agencyId: string, status?: TripStatus) {
    const baseQuery = db
      .select({
        id: trips.id,
        status: trips.status,
        scheduled_date: trips.scheduled_date,
        started_at: trips.started_at,
        completed_at: trips.completed_at,
        created_at: trips.created_at,
        route_name: routes.name,
        from_city: routes.from_city,
        to_city: routes.to_city,
      })
      .from(trips)
      .innerJoin(routes, eq(routes.id, trips.route_id))
      .where(
        status
          ? and(eq(routes.agency_id, agencyId), eq(trips.status, status))
          : eq(routes.agency_id, agencyId)
      )
      .orderBy(desc(trips.scheduled_date));

    return baseQuery;
  }

  // ──────────────────────────────────────────────────────────
  // List Passengers for a trip (operator | conductor)
  // ──────────────────────────────────────────────────────────
  static async listPassengers(tripId: string) {
    const [trip] = await db.select({ id: trips.id }).from(trips).where(eq(trips.id, tripId)).limit(1);
    if (!trip) throw Object.assign(new Error('Trip not found'), { statusCode: 404 });

    return db
      .select({
        id: tripPassengers.id,
        passenger_name: tripPassengers.passenger_name,
        passenger_phone: tripPassengers.passenger_phone,
        alert_status: tripPassengers.alert_status,
        alert_channel: tripPassengers.alert_channel,
        alert_sent_at: tripPassengers.alert_sent_at,
        stop_name: stops.name,
        stop_sequence: stops.sequence_number,
        created_at: tripPassengers.created_at,
      })
      .from(tripPassengers)
      .innerJoin(stops, eq(stops.id, tripPassengers.stop_id))
      .where(eq(tripPassengers.trip_id, tripId))
      .orderBy(stops.sequence_number);
  }

  // ──────────────────────────────────────────────────────────
  // Get Trip Status — status + current location + alert summary
  // ──────────────────────────────────────────────────────────
  static async getTripStatus(tripId: string): Promise<TripStatusResponse> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, tripId))
      .limit(1);

    if (!trip) throw Object.assign(new Error('Trip not found'), { statusCode: 404 });

    // Current bus location (PostGIS decode — raw SQL for ST_X/ST_Y)
    const locationResult = await db.execute<{
      lat: number; lng: number;
      recorded_at: string;
      battery_level: string | null;
      accuracy_meters: string | null;
    }>(sql`
      SELECT
        ST_Y(coordinates::geometry) AS lat,
        ST_X(coordinates::geometry) AS lng,
        recorded_at AT TIME ZONE 'Asia/Kolkata' AS recorded_at,
        battery_level,
        accuracy_meters
      FROM conductor_locations
      WHERE trip_id = ${tripId}
      ORDER BY recorded_at DESC
      LIMIT 1
    `);

    const loc = locationResult.rows[0] ?? null;
    const currentLocation = loc
      ? {
          lat: Number(loc.lat),
          lng: Number(loc.lng),
          recorded_at: String(loc.recorded_at),
          battery_level: loc.battery_level ? Number(loc.battery_level) : null,
          accuracy_meters: loc.accuracy_meters ? Number(loc.accuracy_meters) : null,
        }
      : null;

    // Passenger alert summary — single aggregation query
    const summaryResult = await db.execute<{
      total: string; pending: string; sent: string; failed: string;
    }>(sql`
      SELECT
        COUNT(*)                                                    AS total,
        COUNT(*) FILTER (WHERE alert_status = 'pending')            AS pending,
        COUNT(*) FILTER (WHERE alert_status = 'sent')               AS sent,
        COUNT(*) FILTER (WHERE alert_status = 'failed')             AS failed
      FROM trip_passengers
      WHERE trip_id = ${tripId}
    `);

    const s = summaryResult.rows[0] ?? { total: '0', pending: '0', sent: '0', failed: '0' };

    return {
      id: trip.id,
      status: trip.status as TripStatus,
      scheduled_date: trip.scheduled_date,
      started_at: trip.started_at ? trip.started_at.toISOString() : null,
      completed_at: trip.completed_at ? trip.completed_at.toISOString() : null,
      current_location: currentLocation,
      passengers: {
        total: Number(s.total),
        pending: Number(s.pending),
        sent: Number(s.sent),
        failed: Number(s.failed),
      },
    };
  }


  // ──────────────────────────────────────────────────────────
  // Get Trip with passengers
  // ──────────────────────────────────────────────────────────
  static async getTrip(tripId: string) {
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, tripId))
      .limit(1);

    if (!trip) throw Object.assign(new Error('Trip not found'), { statusCode: 404 });

    const passengers = await db
      .select({
        id: tripPassengers.id,
        passenger_name: tripPassengers.passenger_name,
        passenger_phone: tripPassengers.passenger_phone,
        alert_status: tripPassengers.alert_status,
        alert_sent_at: tripPassengers.alert_sent_at,
        stop_name: stops.name,
        stop_sequence: stops.sequence_number,
      })
      .from(tripPassengers)
      .innerJoin(stops, eq(stops.id, tripPassengers.stop_id))
      .where(eq(tripPassengers.trip_id, tripId));

    return { ...trip, passengers };
  }

  // ──────────────────────────────────────────────────────────
  // Start Trip — conductor only, must be 'scheduled'
  // ──────────────────────────────────────────────────────────
  static async startTrip(tripId: string, conductorId: string) {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);

    if (!trip) throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
    if (trip.conductor_id !== conductorId)
      throw Object.assign(new Error('You are not assigned as conductor of this trip'), { statusCode: 403 });
    if (trip.status !== 'scheduled')
      throw Object.assign(new Error(`Cannot start a trip with status: ${trip.status}`), { statusCode: 409 });

    const [updated] = await db
      .update(trips)
      .set({ status: 'active', started_at: new Date() })
      .where(eq(trips.id, tripId))
      .returning();

    return updated;
  }

  // ──────────────────────────────────────────────────────────
  // Complete Trip — conductor only, must be 'active'
  // Triggers atomic billing deduction for alerts sent.
  // ──────────────────────────────────────────────────────────
  static async completeTrip(tripId: string, conductorId: string) {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);

    if (!trip) throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
    if (trip.conductor_id !== conductorId)
      throw Object.assign(new Error('You are not assigned as conductor of this trip'), { statusCode: 403 });
    if (trip.status !== 'active')
      throw Object.assign(new Error(`Cannot complete a trip with status: ${trip.status}`), { statusCode: 409 });

    const [updated] = await db
      .update(trips)
      .set({ status: 'completed', completed_at: new Date() })
      .where(eq(trips.id, tripId))
      .returning();

    // ── Billing deduction (non-blocking — never fails the trip completion) ──
    // Count passengers whose alerts were actually sent for this trip
    setImmediate(async () => {
      try {
        const [sentRow] = await db
          .select({ cnt: count() })
          .from(tripPassengers)
          .where(
            and(
              eq(tripPassengers.trip_id, tripId),
              eq(tripPassengers.alert_status, 'sent')
            )
          );
        const sentCount = Number(sentRow?.cnt ?? 0);
        if (sentCount === 0) return;

        // Get agency_id via the trip's route
        const [routeRow] = await db
          .select({ agency_id: routes.agency_id })
          .from(routes)
          .where(eq(routes.id, trip.route_id))
          .limit(1);

        if (!routeRow?.agency_id) return;

        await deductAlertCost(routeRow.agency_id, tripId, sentCount);
      } catch (billingErr) {
        // Log but never crash — trip is already completed
        console.error('[Billing] Failed to deduct alert cost for trip', tripId, billingErr);
      }
    });

    return updated;
  }


  // ──────────────────────────────────────────────────────────
  // Add Passenger to Trip
  // ──────────────────────────────────────────────────────────
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
        alert_status: 'pending',
        created_at: new Date(),
      })
      .returning();

    return passenger;
  }

  // ──────────────────────────────────────────────────────────
  // Get Current Bus Location — uses (trip_id, recorded_at DESC) index
  // ST_X/ST_Y decode PostGIS POINT back to lng/lat
  // ──────────────────────────────────────────────────────────
  static async getCurrentLocation(tripId: string) {
    const result = await db.execute<{
      id: string;
      recorded_at: string;
      battery_level: string | null;
      accuracy_meters: string | null;
      lat: number;
      lng: number;
    }>(sql`
      SELECT
        id,
        recorded_at AT TIME ZONE 'Asia/Kolkata' AS recorded_at,
        battery_level,
        accuracy_meters,
        ST_Y(coordinates::geometry) AS lat,
        ST_X(coordinates::geometry) AS lng
      FROM conductor_locations
      WHERE trip_id = ${tripId}
      ORDER BY recorded_at DESC
      LIMIT 1
    `);

    if (!result.rows || result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      lat: Number(row.lat),
      lng: Number(row.lng),
      recorded_at: row.recorded_at,
      battery_level: row.battery_level ? Number(row.battery_level) : null,
      accuracy_meters: row.accuracy_meters ? Number(row.accuracy_meters) : null,
    };
  }
}
