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
exports.addStop = addStop;
exports.listStops = listStops;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
// ── toEWKT helper (PostGIS expects POINT(lng lat)) ───────────────────────────
function toEWKT(lat, lng) {
    return `SRID=4326;POINT(${lng} ${lat})`;
}
// ── Create Route ─────────────────────────────────────────────────────────────
async function createRoute(agencyId, payload) {
    const name = payload.name;
    const fromCity = payload.from_city;
    const toCity = payload.to_city;
    const [existing] = await db_1.db
        .select({ id: schema_1.routes.id })
        .from(schema_1.routes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.routes.name, name)))
        .limit(1);
    if (existing) {
        throw Object.assign(new Error(`Route ${name} already exists in your agency`), { statusCode: 409, code: 'ROUTE_ALREADY_EXISTS' });
    }
    const routeInsert = {
        agency_id: agencyId,
        name,
        from_city: fromCity,
        to_city: toCity,
        created_at: new Date(),
    };
    const [route] = await db_1.db
        .insert(schema_1.routes)
        .values(routeInsert)
        .returning();
    return route;
}
// ── List Routes for an agency ────────────────────────────────────────────────
async function listRoutes(agencyId) {
    return db_1.db
        .select()
        .from(schema_1.routes)
        .where((0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId))
        .orderBy(schema_1.routes.created_at);
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
    const stopInsert = {
        route_id: routeId,
        name,
        sequence_number: sequenceNumber,
        coordinates: toEWKT(latitude, longitude),
        trigger_radius_km: String(triggerRadiusKm),
    };
    const [stop] = await db_1.db
        .insert(schema_1.stops)
        .values(stopInsert)
        .returning({
        id: schema_1.stops.id,
        name: schema_1.stops.name,
        sequence_number: schema_1.stops.sequence_number,
        trigger_radius_km: schema_1.stops.trigger_radius_km,
    });
    return { ...stop, latitude, longitude };
}
// ── List Stops on a Route ────────────────────────────────────────────────────
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
    return db_1.db
        .select({
        id: schema_1.stops.id,
        name: schema_1.stops.name,
        sequence_number: schema_1.stops.sequence_number,
        trigger_radius_km: schema_1.stops.trigger_radius_km,
    })
        .from(schema_1.stops)
        .where((0, drizzle_orm_1.eq)(schema_1.stops.route_id, routeId))
        .orderBy(schema_1.stops.sequence_number);
}
