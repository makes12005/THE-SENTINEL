"use strict";
/**
 * RoutesService — route + stop management
 *
 * All methods receive agencyId from the JWT to ensure
 * operators can only manage their own agency's data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoute = createRoute;
exports.listRoutes = listRoutes;
exports.getRoute = getRoute;
exports.updateRoute = updateRoute;
exports.softDeleteRoute = softDeleteRoute;
exports.addStop = addStop;
exports.updateStop = updateStop;
exports.deleteStop = deleteStop;
exports.listStops = listStops;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
// ── toEWKT helper (PostGIS expects POINT(lng lat)) ───────────────────────────
function toEWKT(lat, lng) {
    return `SRID=4326;POINT(${lng} ${lat})`;
}
// ── Create Route ─────────────────────────────────────────────────────────────
async function createRoute(agencyId, payload, createdBy) {
    const name = payload.name;
    const fromCity = payload.from_city;
    const toCity = payload.to_city;
    const [existing] = await db_1.db
        .select({ id: schema_1.routes.id })
        .from(schema_1.routes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.routes.name, name), (0, drizzle_orm_1.eq)(schema_1.routes.is_active, true)))
        .limit(1);
    if (existing) {
        throw Object.assign(new Error(`Route ${name} already exists in your agency`), { statusCode: 409, code: 'ROUTE_ALREADY_EXISTS' });
    }
    const [route] = await db_1.db
        .insert(schema_1.routes)
        .values({
        agency_id: agencyId,
        name,
        from_city: fromCity,
        to_city: toCity,
        is_active: true,
        is_published: payload.is_published ?? false,
        published_at: payload.is_published ? new Date() : null,
        source: payload.source ?? 'scratch',
        created_by: createdBy ?? null,
        created_at: new Date(),
    })
        .returning();
    return route;
}
// ── List Routes with stop count ───────────────────────────────────────────────
async function listRoutes(agencyId) {
    const rows = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
async function getRoute(routeId, agencyId) {
    const [route] = await db_1.db
        .select()
        .from(schema_1.routes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.id, routeId), (0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.routes.is_active, true)))
        .limit(1);
    if (!route) {
        throw Object.assign(new Error('Route not found or does not belong to your agency'), { statusCode: 404 });
    }
    const stopsData = await listStops(routeId, agencyId);
    return { ...route, stops: stopsData };
}
// ── Update Route ──────────────────────────────────────────────────────────────
async function updateRoute(routeId, agencyId, payload) {
    const [existing] = await db_1.db
        .select({ id: schema_1.routes.id })
        .from(schema_1.routes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.id, routeId), (0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId)))
        .limit(1);
    if (!existing) {
        throw Object.assign(new Error('Route not found or does not belong to your agency'), { statusCode: 404 });
    }
    const [dupe] = await db_1.db
        .select({ id: schema_1.routes.id })
        .from(schema_1.routes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.routes.name, payload.name), (0, drizzle_orm_1.sql) `${schema_1.routes.id} != ${routeId}`))
        .limit(1);
    if (dupe) {
        throw Object.assign(new Error(`Route ${payload.name} already exists in your agency`), { statusCode: 409, code: 'ROUTE_ALREADY_EXISTS' });
    }
    const [updated] = await db_1.db
        .update(schema_1.routes)
        .set({
        name: payload.name,
        from_city: payload.from_city,
        to_city: payload.to_city,
        is_published: payload.is_published ?? false,
        published_at: payload.is_published ? new Date() : null,
        source: payload.source ?? 'scratch',
    })
        .where((0, drizzle_orm_1.eq)(schema_1.routes.id, routeId))
        .returning();
    return updated;
}
// ── Soft Delete Route ─────────────────────────────────────────────────────────
async function softDeleteRoute(routeId, agencyId) {
    const [existing] = await db_1.db
        .select({ id: schema_1.routes.id })
        .from(schema_1.routes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.id, routeId), (0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId)))
        .limit(1);
    if (!existing) {
        throw Object.assign(new Error('Route not found'), { statusCode: 404 });
    }
    const [activeTripUsingRoute] = await db_1.db
        .select({ id: schema_1.trips.id })
        .from(schema_1.trips)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.trips.route_id, routeId), (0, drizzle_orm_1.eq)(schema_1.trips.status, 'active')))
        .limit(1);
    if (activeTripUsingRoute) {
        throw Object.assign(new Error('Cannot delete route while an active trip is using it'), {
            statusCode: 409,
            code: 'ROUTE_IN_USE',
        });
    }
    const [updated] = await db_1.db
        .update(schema_1.routes)
        .set({ is_active: false })
        .where((0, drizzle_orm_1.eq)(schema_1.routes.id, routeId))
        .returning({ id: schema_1.routes.id, is_active: schema_1.routes.is_active });
    return updated;
}
// ── Add Stop to Route ────────────────────────────────────────────────────────
async function addStop(routeId, agencyId, payload) {
    const name = payload.name;
    const sequenceNumber = payload.sequence_number;
    const latitude = payload.latitude;
    const longitude = payload.longitude;
    // Verify route belongs to this agency
    const [route] = await db_1.db
        .select({ id: schema_1.routes.id })
        .from(schema_1.routes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.id, routeId), (0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId)))
        .limit(1);
    if (!route) {
        throw Object.assign(new Error('Route not found or does not belong to your agency'), { statusCode: 404 });
    }
    // Check sequence number uniqueness within this route
    const existing = await db_1.db
        .select({ id: schema_1.stops.id })
        .from(schema_1.stops)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stops.route_id, routeId), (0, drizzle_orm_1.eq)(schema_1.stops.sequence_number, sequenceNumber)))
        .limit(1);
    if (existing.length > 0) {
        throw Object.assign(new Error(`Sequence number ${payload.sequence_number} already used on this route`), { statusCode: 409 });
    }
    const triggerRadiusKm = payload.trigger_radius_km ?? 10;
    const [stop] = await db_1.db
        .insert(schema_1.stops)
        .values({
        route_id: routeId,
        name,
        sequence_number: sequenceNumber,
        coordinates: toEWKT(latitude, longitude),
        trigger_radius_km: String(triggerRadiusKm),
    })
        .returning({
        id: schema_1.stops.id,
        name: schema_1.stops.name,
        sequence_number: schema_1.stops.sequence_number,
        trigger_radius_km: schema_1.stops.trigger_radius_km,
    });
    return { ...stop, latitude, longitude };
}
// ── Update Stop ───────────────────────────────────────────────────────────────
async function updateStop(routeId, stopId, agencyId, payload) {
    if (payload.sequence_number !== undefined) {
        const [sequenceTaken] = await db_1.db
            .select({ id: schema_1.stops.id })
            .from(schema_1.stops)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stops.route_id, routeId), (0, drizzle_orm_1.eq)(schema_1.stops.sequence_number, payload.sequence_number), (0, drizzle_orm_1.sql) `${schema_1.stops.id} != ${stopId}`))
            .limit(1);
        if (sequenceTaken) {
            throw Object.assign(new Error(`Sequence number ${payload.sequence_number} already used on this route`), {
                statusCode: 409,
                code: 'STOP_SEQUENCE_CONFLICT',
            });
        }
    }
    // Verify route ownership
    const [route] = await db_1.db
        .select({ id: schema_1.routes.id })
        .from(schema_1.routes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.id, routeId), (0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId)))
        .limit(1);
    if (!route) {
        throw Object.assign(new Error('Route not found or does not belong to your agency'), { statusCode: 404 });
    }
    const updateValues = {};
    if (payload.name !== undefined)
        updateValues.name = payload.name;
    if (payload.sequence_number !== undefined)
        updateValues.sequence_number = payload.sequence_number;
    if (payload.trigger_radius_km !== undefined)
        updateValues.trigger_radius_km = String(payload.trigger_radius_km);
    if (payload.latitude !== undefined && payload.longitude !== undefined) {
        updateValues.coordinates = toEWKT(payload.latitude, payload.longitude);
    }
    const [updated] = await db_1.db
        .update(schema_1.stops)
        .set(updateValues)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stops.id, stopId), (0, drizzle_orm_1.eq)(schema_1.stops.route_id, routeId)))
        .returning({
        id: schema_1.stops.id,
        name: schema_1.stops.name,
        sequence_number: schema_1.stops.sequence_number,
        trigger_radius_km: schema_1.stops.trigger_radius_km,
    });
    if (!updated) {
        throw Object.assign(new Error('Stop not found'), { statusCode: 404 });
    }
    const lat = payload.latitude ?? 0;
    const lng = payload.longitude ?? 0;
    return { ...updated, latitude: lat, longitude: lng };
}
// ── Delete Stop ───────────────────────────────────────────────────────────────
async function deleteStop(routeId, stopId, agencyId) {
    // Verify route ownership
    const [route] = await db_1.db
        .select({ id: schema_1.routes.id })
        .from(schema_1.routes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.id, routeId), (0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId)))
        .limit(1);
    if (!route) {
        throw Object.assign(new Error('Route not found or does not belong to your agency'), { statusCode: 404 });
    }
    const result = await db_1.db
        .delete(schema_1.stops)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stops.id, stopId), (0, drizzle_orm_1.eq)(schema_1.stops.route_id, routeId)))
        .returning({ id: schema_1.stops.id });
    if (result.length === 0) {
        throw Object.assign(new Error('Stop not found'), { statusCode: 404 });
    }
    return { deleted: true, id: stopId };
}
// ── List Stops on a Route (with lat/lng extracted from PostGIS) ──────────────
async function listStops(routeId, agencyId) {
    // Verify route ownership first
    const [route] = await db_1.db
        .select({ id: schema_1.routes.id })
        .from(schema_1.routes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.id, routeId), (0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId)))
        .limit(1);
    if (!route) {
        throw Object.assign(new Error('Route not found or does not belong to your agency'), { statusCode: 404 });
    }
    const rows = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
