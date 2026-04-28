"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationService = void 0;
exports.toEWKT = toEWKT;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const trip_auth_helper_1 = require("./trip-auth.helper");
/** Converts lat/lng to PostGIS EWKT. POINT takes (longitude latitude). */
function toEWKT(lat, lng) {
    return `SRID=4326;POINT(${lng} ${lat})`;
}
class LocationService {
    /**
     * Saves a GPS ping from the conductor to conductor_locations.
     * Returns the new record's id.
     */
    static async save(tripId, conductorId, payload) {
        const lat = payload.lat;
        const lng = payload.lng;
        const battery_level = payload.battery_level;
        const accuracy_meters = payload.accuracy_meters;
        const locationInsert = {
            trip_id: tripId,
            conductor_id: conductorId,
            coordinates: toEWKT(lat, lng),
            battery_level: battery_level !== undefined ? String(battery_level) : null,
            accuracy_meters: accuracy_meters !== undefined ? String(accuracy_meters) : null,
            recorded_at: new Date(),
        };
        const [saved] = await db_1.db
            .insert(schema_1.conductorLocations)
            .values(locationInsert)
            .returning({ id: schema_1.conductorLocations.id });
        return saved.id;
    }
    /**
     * Validates that the conductor is assigned to this trip AND the trip is active.
     * Throws a shaped error (with statusCode) if validation fails.
     */
    static async assertConductorOwnsActiveTrip(tripId, conductorId) {
        const [trip] = await db_1.db
            .select()
            .from(schema_1.trips)
            .where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId))
            .limit(1);
        if (!trip) {
            throw Object.assign(new Error('Trip not found'), { statusCode: 404 });
        }
        if (trip.conductor_id !== conductorId) {
            await (0, trip_auth_helper_1.logForbiddenAccess)(conductorId, tripId, 'UNAUTHORIZED_LOCATION_UPDATE_ATTEMPT', {
                reason: 'Conductor not assigned to trip',
                assigned_conductor_id: trip.conductor_id,
            });
            throw Object.assign(new Error('You are not assigned to this trip'), { statusCode: 403, code: 'FORBIDDEN' });
        }
        if (trip.status !== 'active') {
            throw Object.assign(new Error('Trip is not active'), { statusCode: 409 });
        }
    }
}
exports.LocationService = LocationService;
