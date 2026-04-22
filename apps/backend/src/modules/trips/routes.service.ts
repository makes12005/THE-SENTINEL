/**
 * RoutesService — route + stop management
 *
 * All methods receive agencyId from the JWT to ensure
 * operators can only manage their own agency's data.
 */

import { db } from '../../db';
import { routes, stops } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { CreateRouteRequest, CreateStopRequest } from '@busalert/shared-types';

// ── toEWKT helper (PostGIS expects POINT(lng lat)) ───────────────────────────
function toEWKT(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

// ── Create Route ─────────────────────────────────────────────────────────────
export async function createRoute(
  agencyId: string,
  payload: CreateRouteRequest
) {
  const name = payload.name!;
  const fromCity = payload.from_city!;
  const toCity = payload.to_city!;

  const routeInsert: typeof routes.$inferInsert = {
    agency_id: agencyId,
    name,
    from_city: fromCity,
    to_city: toCity,
    created_at: new Date(),
  };

  const [route] = await db
    .insert(routes)
    .values(routeInsert)
    .returning();

  return route;
}

// ── List Routes for an agency ────────────────────────────────────────────────
export async function listRoutes(agencyId: string) {
  return db
    .select()
    .from(routes)
    .where(eq(routes.agency_id, agencyId))
    .orderBy(routes.created_at);
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
  const stopInsert: typeof stops.$inferInsert = {
    route_id: routeId,
    name,
    sequence_number: sequenceNumber,
    coordinates: toEWKT(latitude, longitude),
    trigger_radius_km: String(triggerRadiusKm),
  };

  const [stop] = await db
    .insert(stops)
    .values(stopInsert)
    .returning({
      id: stops.id,
      name: stops.name,
      sequence_number: stops.sequence_number,
      trigger_radius_km: stops.trigger_radius_km,
    });

  return { ...stop, latitude, longitude };
}

// ── List Stops on a Route ────────────────────────────────────────────────────
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

  return db
    .select({
      id: stops.id,
      name: stops.name,
      sequence_number: stops.sequence_number,
      trigger_radius_km: stops.trigger_radius_km,
    })
    .from(stops)
    .where(eq(stops.route_id, routeId))
    .orderBy(stops.sequence_number);
}
