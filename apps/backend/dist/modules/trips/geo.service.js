"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoService = exports.ALERT_QUEUE_KEY = void 0;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const redis_1 = require("../../lib/redis");
const drizzle_orm_1 = require("drizzle-orm");
exports.ALERT_QUEUE_KEY = 'alert_queue';
class GeoService {
    /**
     * Core geo-fencing logic. Uses PostGIS ST_DWithin with geography cast so
     * distances are measured in metres on Earth's actual surface (not planar).
     *
     * Only considers passengers with alert_status = 'pending'.
     * On trigger:
     *   1. Atomically marks alert_status → 'sent' (idempotent guard prevents double-fire).
     *   2. Pushes AlertQueueItem to Redis RPUSH alert_queue for async call worker.
     *
     * @returns number of alerts triggered in this ping
     */
    static async checkStopProximity(tripId, lat, lng) {
        // GIST index on stops.coordinates is used automatically by ST_DWithin
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT
        tp.id              AS passenger_id,
        tp.passenger_name,
        tp.passenger_phone,
        s.name             AS stop_name,
        s.trigger_radius_km::float AS trigger_radius_km,
        (
          ST_Distance(
            s.coordinates::geography,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          ) / 1000.0
        )::float AS distance_km
      FROM trip_passengers tp
      JOIN stops s ON s.id = tp.stop_id
      WHERE
        tp.trip_id      = ${tripId}
        AND tp.alert_status = 'pending'
    `);
        const rows = Array.from(result).filter((row) => Number(row.distance_km) < Number(row.trigger_radius_km));
        if (rows.length === 0)
            return 0;
        const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        let triggered = 0;
        for (const row of rows) {
            try {
                console.log('[GeoService] Distance to stop:', Number(row.distance_km).toFixed(3), 'km', '| stop:', row.stop_name, '| radius:', Number(row.trigger_radius_km).toFixed(2), 'km');
                // Idempotent: only proceed if still 'pending' (race-condition safe)
                const updated = await db_1.db
                    .update(schema_1.tripPassengers)
                    .set({ alert_status: 'sent', alert_sent_at: new Date() })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tripPassengers.id, row.passenger_id), (0, drizzle_orm_1.eq)(schema_1.tripPassengers.alert_status, 'pending')))
                    .returning({ id: schema_1.tripPassengers.id });
                if (updated.length === 0)
                    continue; // already triggered by concurrent ping
                const item = {
                    tripId: tripId,
                    tripPassengerId: row.passenger_id,
                    passengerPhone: row.passenger_phone,
                    passengerName: row.passenger_name,
                    stopName: row.stop_name,
                    triggeredAt: now,
                };
                await redis_1.redis.rpush(exports.ALERT_QUEUE_KEY, JSON.stringify(item));
                triggered++;
            }
            catch (err) {
                // Log but continue — other passengers must still be processed
                console.error(`[GeoService] Alert failed for passenger ${row.passenger_id}:`, err);
            }
        }
        return triggered;
    }
}
exports.GeoService = GeoService;
