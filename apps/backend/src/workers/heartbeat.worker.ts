/**
 * Heartbeat Worker — standalone process
 *
 * Run: `tsx src/workers/heartbeat.worker.ts`
 *
 * Polls conductor_locations every 30 seconds.
 * For each ACTIVE trip:
 *   - If last ping > 2 minutes ago → emit conductor_offline (once per state change)
 *   - If conductor recovered (new ping) → emit conductor_online
 *
 * Every 5 minutes:
 *   - Find scheduled trips > 4 hours past due → mark expired
 *
 * In-memory state Map prevents duplicate events:
 *   offlineTrips: Set<tripId>  — currently offline trips
 *
 * On crash: no state lost — next poll re-derives state from DB.
 */

import { db }                 from '../db';
import { trips, conductorLocations, auditLogs, agencyWallets, routes, users } from '../db/schema';
import { eq, desc, and, lt, sql } from 'drizzle-orm';
import { emitSocketEvent } from '../lib/socket';
import cron from 'node-cron';

const POLL_INTERVAL_MS    = 30_000;   // 30 seconds
const OFFLINE_THRESHOLD_S = 120;      // 2 minutes in seconds

let isShuttingDown = false;
process.on('SIGTERM', () => { isShuttingDown = true; });
process.on('SIGINT',  () => { isShuttingDown = true; });

/** Tracks which trips are currently in the "conductor offline" state */
const offlineTrips = new Set<string>();

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Returns all currently ACTIVE trips with their latest conductor ping info.
 */
async function getActiveTripsWithHeartbeat(): Promise<Array<{
  tripId:      string;
  conductorId: string;
  driverId:    string | null;
  lastSeenAt:  Date | null;
}>> {
  // Get all active trips
  const activeTrips = await db
    .select({
      id:           trips.id,
      conductor_id: trips.conductor_id,
      driver_id:    trips.driver_id,
    })
    .from(trips)
    .where(eq(trips.status, 'active'));

  if (activeTrips.length === 0) return [];

  // For each active trip, get the most recent conductor_locations row
  const results: Array<{
    tripId:     string;
    conductorId: string;
    driverId:    string | null;
    lastSeenAt:  Date | null;
  }> = [];

  for (const trip of activeTrips) {
    const [latestLoc] = await db
      .select({ recorded_at: conductorLocations.recorded_at })
      .from(conductorLocations)
      .where(eq(conductorLocations.trip_id, trip.id))
      .orderBy(desc(conductorLocations.recorded_at))
      .limit(1);

    results.push({
      tripId:      trip.id,
      conductorId: trip.conductor_id,
      driverId:    trip.driver_id ?? null,
      lastSeenAt:  latestLoc?.recorded_at ?? null,
    });
  }

  return results;
}

async function poll() {
  let heartbeats: Awaited<ReturnType<typeof getActiveTripsWithHeartbeat>>;
  try {
    heartbeats = await getActiveTripsWithHeartbeat();
  } catch (err: any) {
    console.error('[HeartbeatWorker] DB query failed:', err?.message);
    return;
  }

  const now = Date.now();

  for (const hb of heartbeats) {
    const { tripId, conductorId, driverId, lastSeenAt } = hb;

    // Compute gap in seconds
    const ageSeconds = lastSeenAt
      ? (now - lastSeenAt.getTime()) / 1000
      : Infinity;   // never pinged → treat as offline immediately

    const isCurrentlyOffline = ageSeconds > OFFLINE_THRESHOLD_S;
    const wasOffline          = offlineTrips.has(tripId);

    if (isCurrentlyOffline && !wasOffline) {
      // ── Transition: online → offline ────────────────────────────────────────
      console.warn(`[HeartbeatWorker] conductor OFFLINE — trip ${tripId} | lastSeen: ${lastSeenAt?.toISOString() ?? 'never'}`);
      offlineTrips.add(tripId);

      await emitSocketEvent(`trip:${tripId}`, 'conductor_offline', {
        tripId,
        conductorId,
        driverId,
        lastSeenAt: lastSeenAt?.toISOString() ?? null,
        detectedAt: new Date().toISOString(),
      });

      // Write audit log (fire-and-forget — don't block poll loop)
      db.insert(auditLogs).values({
        user_id:     conductorId,
        action:      'CONDUCTOR_OFFLINE',
        entity_type: 'trip',
        entity_id:   tripId,
        metadata:    {
          conductor_id: conductorId,
          driver_id:    driverId,
          last_seen_at: lastSeenAt?.toISOString() ?? null,
          age_seconds:  Math.round(ageSeconds),
        },
      }).catch((e: any) => console.error('[HeartbeatWorker] Audit log error:', e?.message));

    } else if (!isCurrentlyOffline && wasOffline) {
      // ── Transition: offline → online ────────────────────────────────────────
      console.log(`[HeartbeatWorker] conductor RECOVERED — trip ${tripId}`);
      offlineTrips.delete(tripId);

      await emitSocketEvent(`trip:${tripId}`, 'conductor_online', {
        tripId,
        conductorId,
        recoveredAt: new Date().toISOString(),
      });

      db.insert(auditLogs).values({
        user_id:     conductorId,
        action:      'CONDUCTOR_ONLINE',
        entity_type: 'trip',
        entity_id:   tripId,
        metadata:    {
          conductor_id: conductorId,
          driver_id:    driverId,
          recovered_at: new Date().toISOString(),
        },
      }).catch((e: any) => console.error('[HeartbeatWorker] Recovery audit log error:', e?.message));
    }
  }

  // Clean up state for trips that are no longer active
  for (const tripId of offlineTrips) {
    if (!heartbeats.find((h) => h.tripId === tripId)) {
      offlineTrips.delete(tripId);
    }
  }
}

/**
 * Mark scheduled trips as expired if their scheduled_date+time is
 * more than 4 hours in the past.
 */
async function checkExpiredTrips() {
  try {
    // Find scheduled trips where scheduled_date < NOW() - 4 hours
    const expiredRows = await db.execute<{
      id: string;
      conductor_id: string;
      assigned_to_operator_id: string | null;
      route_name: string;
    }>(sql`
      SELECT t.id, t.conductor_id, t.assigned_to_operator_id,
             r.name as route_name, r.from_city, r.to_city
      FROM trips t
      INNER JOIN routes r ON r.id = t.route_id
      WHERE t.status = 'scheduled'
        AND (
          -- If scheduled_time is set, combine date+time; otherwise treat as start of day
          CASE
            WHEN t.scheduled_time IS NOT NULL
              THEN (t.scheduled_date::text || ' ' || t.scheduled_time)::timestamp AT TIME ZONE 'Asia/Kolkata'
            ELSE t.scheduled_date::timestamp AT TIME ZONE 'Asia/Kolkata'
          END
        ) < (NOW() - INTERVAL '4 hours')
    `);

    for (const row of Array.from(expiredRows)) {
      // Update status to 'expired' via raw SQL since the enum doesn't have it yet
      await db.execute(sql`
        UPDATE trips SET status = 'expired' WHERE id = ${row.id}
      `);

      // Audit log
      await db.insert(auditLogs).values({
        action: 'TRIP_EXPIRED',
        entity_type: 'trip',
        entity_id: row.id,
        metadata: {
          route_name: row.route_name,
          conductor_id: row.conductor_id,
          operator_id: row.assigned_to_operator_id,
        },
      }).catch((e: any) => console.error('[HeartbeatWorker] TRIP_EXPIRED audit log error:', e?.message));

      // Emit socket event
      await emitSocketEvent(`trip:${row.id}`, 'trip_expired', {
        tripId: row.id,
        routeName: row.route_name,
        conductorId: row.conductor_id,
        operatorId: row.assigned_to_operator_id,
      });

      if (row.assigned_to_operator_id) {
        await emitSocketEvent(`user:${row.assigned_to_operator_id}`, 'trip_expired', {
          tripId: row.id,
          routeName: row.route_name,
        });
      }

      console.log(`[HeartbeatWorker] Trip ${row.id} marked EXPIRED`);
    }
  } catch (err: any) {
    console.error('[HeartbeatWorker] Expired trip check failed:', err?.message);
  }
}

async function main() {
  console.log('Heartbeat worker started');

  // ── Monthly Reset Cron ──────────────────────────────────────────────────
  // Resets trips_used_this_month = 0 for all agencies on the 1st of every month
  cron.schedule('0 0 1 * *', async () => {
    console.log('[HeartbeatWorker] Starting monthly trip reset...');
    try {
      await db.update(agencyWallets).set({ trips_used_this_month: 0 });
      console.log('[HeartbeatWorker] Monthly trip reset successful');
      
      // Audit log the reset
      await db.insert(auditLogs).values({
        action: 'MONTHLY_TRIP_RESET',
        entity_type: 'system',
        metadata: {
          timestamp: new Date().toISOString(),
          description: 'Reset trips_used_this_month for all agencies'
        }
      });
    } catch (err: any) {
      console.error('[HeartbeatWorker] Monthly reset failed:', err?.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // ── Expired Trip Check Cron ─────────────────────────────────────────────
  // Every 5 minutes, mark scheduled trips that are 4+ hours past due as expired
  cron.schedule('*/5 * * * *', async () => {
    await checkExpiredTrips();
  }, {
    timezone: 'Asia/Kolkata'
  });

  while (!isShuttingDown) {
    await poll();
    // Sleep for the poll interval, but check shutdown flag between intervals
    await sleep(POLL_INTERVAL_MS);
  }

  console.log('[HeartbeatWorker] Shutting down gracefully');
  process.exit(0);
}

main();
