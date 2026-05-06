/**
 * RoutesService — route + stop management
 *
 * All methods receive agencyId from the JWT to ensure
 * operators can only manage their own agency's data.
 */

import { db } from '../../db';
import { routes, stops, trips, users } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { CreateRouteRequest, CreateStopRequest } from '../../lib/shared-types';

// ── toEWKT helper (PostGIS expects POINT(lng lat)) ───────────────────────────
function toEWKT(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

// ── Create Route ─────────────────────────────────────────────────────────────
export async function createRoute(
  agencyId: string,
  payload: CreateRouteRequest,
  createdBy?: string
) {
  const name = payload.name!;
  const fromCity = payload.from_city!;
  const toCity = payload.to_city!;

  const [existing] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(and(eq(routes.agency_id, agencyId), eq(routes.name, name), eq(routes.is_active, true)))
    .limit(1);

  if (existing) {
    throw Object.assign(
      new Error(`Route ${name} already exists in your agency`),
      { statusCode: 409, code: 'ROUTE_ALREADY_EXISTS' }
    );
  }

  const [route] = await db
    .insert(routes)
    .values({
      agency_id: agencyId,
      name,
      from_city: fromCity,
      to_city: toCity,
      is_active: true,
      created_by: createdBy ?? null,
      created_at: new Date(),
    })
    .returning();

  return route;
}

// ── List Routes with stop count ───────────────────────────────────────────────
export async function listRoutes(agencyId: string) {
  const rows = await db.execute<{
    id: string;
    name: string;
    from_city: string;
    to_city: string;
    is_active: boolean;
    created_at: string;
    created_by: string | null;
    created_by_name: string | null;
    stop_count: string;
  }>(sql`
    SELECT
      r.id,
      r.name,
      r.from_city,
      r.to_city,
      r.is_active,
      r.created_at::text,
      r.created_by,
      u.name as created_by_name,
      count(s.id)::text as stop_count
    FROM routes r
    LEFT JOIN users u ON u.id = r.created_by
    LEFT JOIN stops s ON s.route_id = r.id
    WHERE r.agency_id = ${agencyId} AND r.is_active = true
    GROUP BY r.id, u.name
    ORDER BY r.created_at ASC
  `);

  return rows.map((r) => ({ ...r, stop_count: Number(r.stop_count ?? 0) }));
}

// ── Get Single Route with stops ───────────────────────────────────────────────
export async function getRoute(routeId: string, agencyId: string) {
  const [route] = await db
    .select()
    .from(routes)
    .where(and(eq(routes.id, routeId), eq(routes.agency_id, agencyId), eq(routes.is_active, true)))
    .limit(1);

  if (!route) {
    throw Object.assign(new Error('Route not found or does not belong to your agency'), { statusCode: 404 });
  }

  const stopsData = await listStops(routeId, agencyId);
  return { ...route, stops: stopsData };
}

// ── Update Route ──────────────────────────────────────────────────────────────
export async function updateRoute(
  routeId: string,
  agencyId: string,
  payload: CreateRouteRequest
) {
  const [existing] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(and(eq(routes.id, routeId), eq(routes.agency_id, agencyId)))
    .limit(1);
  if (!existing) {
    throw Object.assign(new Error('Route not found or does not belong to your agency'), { statusCode: 404 });
  }

  const [dupe] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(and(eq(routes.agency_id, agencyId), eq(routes.name, payload.name), sql`${routes.id} != ${routeId}` as any))
    .limit(1);
  if (dupe) {
    throw Object.assign(new Error(`Route ${payload.name} already exists in your agency`), { statusCode: 409, code: 'ROUTE_ALREADY_EXISTS' });
  }

  const [updated] = await db
    .update(routes)
    .set({
      name: payload.name,
      from_city: payload.from_city,
      to_city: payload.to_city,
    })
    .where(eq(routes.id, routeId))
    .returning();

  return updated;
}

// ── Soft Delete Route ─────────────────────────────────────────────────────────
export async function softDeleteRoute(routeId: string, agencyId: string) {
  const [existing] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(and(eq(routes.id, routeId), eq(routes.agency_id, agencyId)))
    .limit(1);

  if (!existing) {
    throw Object.assign(new Error('Route not found'), { statusCode: 404 });
  }

  const [activeTripUsingRoute] = await db
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.route_id, routeId), eq(trips.status, 'active')))
    .limit(1);
  if (activeTripUsingRoute) {
    throw Object.assign(new Error('Cannot delete route while an active trip is using it'), {
      statusCode: 409,
      code: 'ROUTE_IN_USE',
    });
  }

  const [updated] = await db
    .update(routes)
    .set({ is_active: false })
    .where(eq(routes.id, routeId))
    .returning({ id: routes.id, is_active: routes.is_active });

  return updated;
}

// ── Add Stop to Route ────────────────────────────────────────────────────────
export async function addStop(
  routeId: string,
  agencyId: string,
  payload: CreateStopRequest
) {
  const name = payload.name!;
  const sequenceNumber = payload.sequence_number!;
  const latitude = payload.latitude!;
  const longitude = payload.longitude!;

  // Verify route belongs to this agency
  const [route] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(and(eq(routes.id, routeId), eq(routes.agency_id, agencyId)))
    .limit(1);

  if (!route) {
    throw Object.assign(
      new Error('Route not found or does not belong to your agency'),
      { statusCode: 404 }
    );
  }

  // Check sequence number uniqueness within this route
  const existing = await db
    .select({ id: stops.id })
    .from(stops)
    .where(and(eq(stops.route_id, routeId), eq(stops.sequence_number, sequenceNumber)))
    .limit(1);

  if (existing.length > 0) {
    throw Object.assign(
      new Error(`Sequence number ${payload.sequence_number} already used on this route`),
      { statusCode: 409 }
    );
  }

  const triggerRadiusKm = payload.trigger_radius_km ?? 10;
  const [stop] = await db
    .insert(stops)
    .values({
      route_id: routeId,
      name,
      sequence_number: sequenceNumber,
      coordinates: toEWKT(latitude, longitude),
      trigger_radius_km: String(triggerRadiusKm),
    })
    .returning({
      id: stops.id,
      name: stops.name,
      sequence_number: stops.sequence_number,
      trigger_radius_km: stops.trigger_radius_km,
    });

  return { ...stop, latitude, longitude };
}

// ── Update Stop ───────────────────────────────────────────────────────────────
export async function updateStop(
  routeId: string,
  stopId: string,
  agencyId: string,
  payload: Partial<CreateStopRequest>
) {
  if (payload.sequence_number !== undefined) {
    const [sequenceTaken] = await db
      .select({ id: stops.id })
      .from(stops)
      .where(
        and(
          eq(stops.route_id, routeId),
          eq(stops.sequence_number, payload.sequence_number),
          sql`${stops.id} != ${stopId}` as any
        )
      )
      .limit(1);
    if (sequenceTaken) {
      throw Object.assign(new Error(`Sequence number ${payload.sequence_number} already used on this route`), {
        statusCode: 409,
        code: 'STOP_SEQUENCE_CONFLICT',
      });
    }
  }

  // Verify route ownership
  const [route] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(and(eq(routes.id, routeId), eq(routes.agency_id, agencyId)))
    .limit(1);

  if (!route) {
    throw Object.assign(new Error('Route not found or does not belong to your agency'), { statusCode: 404 });
  }

  const updateValues: Partial<typeof stops.$inferInsert> = {};
  if (payload.name !== undefined) updateValues.name = payload.name;
  if (payload.sequence_number !== undefined) updateValues.sequence_number = payload.sequence_number;
  if (payload.trigger_radius_km !== undefined) updateValues.trigger_radius_km = String(payload.trigger_radius_km);
  if (payload.latitude !== undefined && payload.longitude !== undefined) {
    updateValues.coordinates = toEWKT(payload.latitude, payload.longitude);
  }

  const [updated] = await db
    .update(stops)
    .set(updateValues)
    .where(and(eq(stops.id, stopId), eq(stops.route_id, routeId)))
    .returning({
      id: stops.id,
      name: stops.name,
      sequence_number: stops.sequence_number,
      trigger_radius_km: stops.trigger_radius_km,
    });

  if (!updated) {
    throw Object.assign(new Error('Stop not found'), { statusCode: 404 });
  }

  const lat = payload.latitude ?? 0;
  const lng = payload.longitude ?? 0;
  return { ...updated, latitude: lat, longitude: lng };
}

// ── Delete Stop ───────────────────────────────────────────────────────────────
export async function deleteStop(routeId: string, stopId: string, agencyId: string) {
  // Verify route ownership
  const [route] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(and(eq(routes.id, routeId), eq(routes.agency_id, agencyId)))
    .limit(1);

  if (!route) {
    throw Object.assign(new Error('Route not found or does not belong to your agency'), { statusCode: 404 });
  }

  const result = await db
    .delete(stops)
    .where(and(eq(stops.id, stopId), eq(stops.route_id, routeId)))
    .returning({ id: stops.id });

  if (result.length === 0) {
    throw Object.assign(new Error('Stop not found'), { statusCode: 404 });
  }

  return { deleted: true, id: stopId };
}

// ── List Stops on a Route (with lat/lng extracted from PostGIS) ──────────────
export async function listStops(routeId: string, agencyId: string) {
  // Verify route ownership first
  const [route] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(and(eq(routes.id, routeId), eq(routes.agency_id, agencyId)))
    .limit(1);

  if (!route) {
    throw Object.assign(
      new Error('Route not found or does not belong to your agency'),
      { statusCode: 404 }
    );
  }

  const rows = await db.execute<{
    id: string;
    name: string;
    sequence_number: number;
    trigger_radius_km: string;
    lat: string;
    lng: string;
  }>(sql`
    SELECT
      id,
      name,
      sequence_number,
      trigger_radius_km::text,
      ST_Y(coordinates::geometry)::text as lat,
      ST_X(coordinates::geometry)::text as lng
    FROM stops
    WHERE route_id = ${routeId}
    ORDER BY sequence_number ASC
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sequence_number: Number(r.sequence_number),
    trigger_radius_km: r.trigger_radius_km,
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lng),
  }));
}
