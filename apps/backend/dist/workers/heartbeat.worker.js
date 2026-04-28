"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const socket_1 = require("../lib/socket");
const node_cron_1 = __importDefault(require("node-cron"));
const POLL_INTERVAL_MS = 30000; // 30 seconds
const OFFLINE_THRESHOLD_S = 120; // 2 minutes in seconds
let isShuttingDown = false;
process.on('SIGTERM', () => { isShuttingDown = true; });
process.on('SIGINT', () => { isShuttingDown = true; });
/** Tracks which trips are currently in the "conductor offline" state */
const offlineTrips = new Set();
async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
/**
 * Returns all currently ACTIVE trips with their latest conductor ping info.
 */
async function getActiveTripsWithHeartbeat() {
    // Get all active trips
    const activeTrips = await db_1.db
        .select({
        id: schema_1.trips.id,
        conductor_id: schema_1.trips.conductor_id,
        driver_id: schema_1.trips.driver_id,
    })
        .from(schema_1.trips)
        .where((0, drizzle_orm_1.eq)(schema_1.trips.status, 'active'));
    if (activeTrips.length === 0)
        return [];
    // For each active trip, get the most recent conductor_locations row
    const results = [];
    for (const trip of activeTrips) {
        const [latestLoc] = await db_1.db
            .select({ recorded_at: schema_1.conductorLocations.recorded_at })
            .from(schema_1.conductorLocations)
            .where((0, drizzle_orm_1.eq)(schema_1.conductorLocations.trip_id, trip.id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.conductorLocations.recorded_at))
            .limit(1);
        results.push({
            tripId: trip.id,
            conductorId: trip.conductor_id,
            driverId: trip.driver_id ?? null,
            lastSeenAt: latestLoc?.recorded_at ?? null,
        });
    }
    return results;
}
async function poll() {
    let heartbeats;
    try {
        heartbeats = await getActiveTripsWithHeartbeat();
    }
    catch (err) {
        console.error('[HeartbeatWorker] DB query failed:', err?.message);
        return;
    }
    const now = Date.now();
    for (const hb of heartbeats) {
        const { tripId, conductorId, driverId, lastSeenAt } = hb;
        // Compute gap in seconds
        const ageSeconds = lastSeenAt
            ? (now - lastSeenAt.getTime()) / 1000
            : Infinity; // never pinged → treat as offline immediately
        const isCurrentlyOffline = ageSeconds > OFFLINE_THRESHOLD_S;
        const wasOffline = offlineTrips.has(tripId);
        if (isCurrentlyOffline && !wasOffline) {
            // ── Transition: online → offline ────────────────────────────────────────
            console.warn(`[HeartbeatWorker] conductor OFFLINE — trip ${tripId} | lastSeen: ${lastSeenAt?.toISOString() ?? 'never'}`);
            offlineTrips.add(tripId);
            await (0, socket_1.emitSocketEvent)(`trip:${tripId}`, 'conductor_offline', {
                tripId,
                conductorId,
                driverId,
                lastSeenAt: lastSeenAt?.toISOString() ?? null,
                detectedAt: new Date().toISOString(),
            });
            // Write audit log (fire-and-forget — don't block poll loop)
            db_1.db.insert(schema_1.auditLogs).values({
                user_id: conductorId,
                action: 'CONDUCTOR_OFFLINE',
                entity_type: 'trip',
                entity_id: tripId,
                metadata: {
                    conductor_id: conductorId,
                    driver_id: driverId,
                    last_seen_at: lastSeenAt?.toISOString() ?? null,
                    age_seconds: Math.round(ageSeconds),
                },
            }).catch((e) => console.error('[HeartbeatWorker] Audit log error:', e?.message));
        }
        else if (!isCurrentlyOffline && wasOffline) {
            // ── Transition: offline → online ────────────────────────────────────────
            console.log(`[HeartbeatWorker] conductor RECOVERED — trip ${tripId}`);
            offlineTrips.delete(tripId);
            await (0, socket_1.emitSocketEvent)(`trip:${tripId}`, 'conductor_online', {
                tripId,
                conductorId,
                recoveredAt: new Date().toISOString(),
            });
            db_1.db.insert(schema_1.auditLogs).values({
                user_id: conductorId,
                action: 'CONDUCTOR_ONLINE',
                entity_type: 'trip',
                entity_id: tripId,
                metadata: {
                    conductor_id: conductorId,
                    driver_id: driverId,
                    recovered_at: new Date().toISOString(),
                },
            }).catch((e) => console.error('[HeartbeatWorker] Recovery audit log error:', e?.message));
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
    console.log('Heartbeat worker started');
    // ── Monthly Reset Cron ──────────────────────────────────────────────────
    // Resets trips_used_this_month = 0 for all agencies on the 1st of every month
    node_cron_1.default.schedule('0 0 1 * *', async () => {
        console.log('[HeartbeatWorker] Starting monthly trip reset...');
        try {
            await db_1.db.update(schema_1.agencyWallets).set({ trips_used_this_month: 0 });
            console.log('[HeartbeatWorker] Monthly trip reset successful');
            // Audit log the reset
            await db_1.db.insert(schema_1.auditLogs).values({
                action: 'MONTHLY_TRIP_RESET',
                entity_type: 'system',
                metadata: {
                    timestamp: new Date().toISOString(),
                    description: 'Reset trips_used_this_month for all agencies'
                }
            });
        }
        catch (err) {
            console.error('[HeartbeatWorker] Monthly reset failed:', err?.message);
        }
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
