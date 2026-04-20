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
 * In-memory state Map prevents duplicate events:
 *   offlineTrips: Set<tripId>  — currently offline trips
 *
 * On crash: no state lost — next poll re-derives state from DB.
 */

import 'dotenv/config';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import { db }                 from '../db';
import { trips, conductorLocations, users, auditLogs } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getIO }              from '../lib/socket';

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
  let io: ReturnType<typeof getIO> | null = null;
  try { io = getIO(); } catch { /* Socket.IO not yet initialised — skip */ }
  if (!io) {
    console.warn('[HeartbeatWorker] Socket.IO not initialised yet — skipping poll');
    return;
  }

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

      // Emit to all sockets in trip room
      io.to(`trip:${tripId}`).emit('conductor_offline', {
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

      io.to(`trip:${tripId}`).emit('conductor_online', {
        tripId,
        conductorId,
        recoveredAt: new Date().toISOString(),
      });
    }
  }

  // Clean up state for trips that are no longer active
  for (const tripId of offlineTrips) {
    if (!heartbeats.find((h) => h.tripId === tripId)) {
      offlineTrips.delete(tripId);
    }
  }
}

async function main() {
  console.log('[HeartbeatWorker] Started — polling every 30s for conductor heartbeats');

  while (!isShuttingDown) {
    await poll();
    // Sleep for the poll interval, but check shutdown flag between intervals
    await sleep(POLL_INTERVAL_MS);
  }

  console.log('[HeartbeatWorker] Shutting down gracefully');
  process.exit(0);
}

main();
