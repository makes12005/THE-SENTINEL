import { db } from '../../db';
import { tripPassengers } from '../../db/schema';
import { redis } from '../../lib/redis';
import { sql, and, eq } from 'drizzle-orm';

export const ALERT_QUEUE_KEY = 'alert_queue';

export interface AlertQueueItem {
  tripId: string;
  tripPassengerId: string;
  passengerPhone: string;   // E.164 (+91XXXXXXXXXX)
  passengerName: string;
  stopName: string;
  triggeredAt: string;      // ISO timestamp (IST)
}

export class GeoService {
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
  static async checkStopProximity(
    tripId: string,
    lat: number,
    lng: number
  ): Promise<number> {
    // GIST index on stops.coordinates is used automatically by ST_DWithin
    const result = await db.execute<{
      passenger_id: string;
      passenger_name: string;
      passenger_phone: string;
      stop_name: string;
      trigger_radius_km: number;
      distance_km: number;
    }>(sql`
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
    if (rows.length === 0) return 0;

    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    let triggered = 0;

    for (const row of rows) {
      try {
        console.log('[GeoService] Distance to stop:', Number(row.distance_km).toFixed(3), 'km', '| stop:', row.stop_name, '| radius:', Number(row.trigger_radius_km).toFixed(2), 'km');

        // Idempotent: only proceed if still 'pending' (race-condition safe)
        const updated = await db
          .update(tripPassengers)
          .set({ alert_status: 'sent', alert_sent_at: new Date() })
          .where(
            and(
              eq(tripPassengers.id, row.passenger_id),
              eq(tripPassengers.alert_status, 'pending')
            )
          )
          .returning({ id: tripPassengers.id });

        if (updated.length === 0) continue; // already triggered by concurrent ping

        const item: AlertQueueItem = {
          tripId: tripId,
          tripPassengerId: row.passenger_id,
          passengerPhone: row.passenger_phone,
          passengerName: row.passenger_name,
          stopName: row.stop_name,
          triggeredAt: now,
        };
        await redis.rpush(ALERT_QUEUE_KEY, JSON.stringify(item));
        triggered++;
      } catch (err) {
        // Log but continue — other passengers must still be processed
        console.error(`[GeoService] Alert failed for passenger ${row.passenger_id}:`, err);
      }
    }

    return triggered;
  }
}
