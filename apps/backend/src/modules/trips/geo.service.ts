import { db } from '../../db';
import { tripPassengers } from '../../db/schema';
import { redis } from '../../lib/redis';
import { sql, and, eq } from 'drizzle-orm';

export const ALERT_QUEUE_KEY = 'alert_queue';

export interface AlertQueueItem {
  passenger_id: string;
  trip_id: string;
  passenger_name: string;
  passenger_phone: string;   // E.164 (+91XXXXXXXXXX)
  stop_name: string;
  triggered_at: string;      // ISO timestamp (IST)
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
    }>(sql`
      SELECT
        tp.id              AS passenger_id,
        tp.passenger_name,
        tp.passenger_phone,
        s.name             AS stop_name
      FROM trip_passengers tp
      JOIN stops s ON s.id = tp.stop_id
      WHERE
        tp.trip_id      = ${tripId}
        AND tp.alert_status = 'pending'
        AND ST_DWithin(
          s.coordinates::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          (s.trigger_radius_km::float * 1000)
        )
    `);

    if (!result.rows || result.rows.length === 0) return 0;

    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    let triggered = 0;

    for (const row of result.rows) {
      try {
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
          passenger_id: row.passenger_id,
          trip_id: tripId,
          passenger_name: row.passenger_name,
          passenger_phone: row.passenger_phone,
          stop_name: row.stop_name,
          triggered_at: now,
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
