/**
 * Alert Worker — standalone process
 *
 * Run: `tsx src/workers/alert.worker.ts` (separate from Fastify)
 *
 * Uses BLPOP (blocking pop) so it sleeps when the queue is empty —
 * no CPU spin. Queue key: "alert_queue". Timeout: 5 seconds (re-evaluates).
 *
 * Jobs in Redis survive server restarts (nothing lost on crash).
 * Exponential backoff on consecutive DB/network errors.
 */

import 'dotenv/config';
import path from 'path';

// Ensure .env is loaded from monorepo root before any service imports
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import { redis }            from '../lib/redis';
import { runAlertCascade, AlertJob } from '../modules/alerts/alert.orchestrator';

const QUEUE_KEY   = 'alert_queue';
const BLPOP_TIMEOUT = 5;   // seconds — re-checks for clean shutdown every 5s

let isShuttingDown = false;

process.on('SIGTERM', () => { isShuttingDown = true; });
process.on('SIGINT',  () => { isShuttingDown = true; });

/**
 * Exponential backoff — doubles on each consecutive failure, cap 60s, reset on success.
 */
function calcBackoff(consecutiveErrors: number): number {
  return Math.min(1000 * Math.pow(2, consecutiveErrors), 60_000);
}

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function main() {
  console.log('Alert worker started');
  console.log('Waiting for jobs...');

  let consecutiveErrors = 0;

  while (!isShuttingDown) {
    try {
      // BLPOP returns null on timeout or [key, value] on success
      const result = await redis.blpop(QUEUE_KEY, BLPOP_TIMEOUT);

      if (!result) continue;   // timeout — loop again

      const [, rawJob] = result;
      let job: AlertJob;

      try {
        const parsed = JSON.parse(rawJob) as any;
        // Backward-compatible mapping for legacy queue payloads.
        job = {
          tripId: parsed.tripId ?? parsed.trip_id,
          passengerId: parsed.passengerId ?? parsed.tripPassengerId ?? parsed.passenger_id,
          passengerPhone: parsed.passengerPhone ?? parsed.passenger_phone,
          passengerName: parsed.passengerName ?? parsed.passenger_name,
          stopName: parsed.stopName ?? parsed.stop_name,
        };
      } catch {
        console.error('[AlertWorker] Malformed job — skipping:', rawJob);
        consecutiveErrors = 0;
        continue;
      }

      if (!job.tripId || !job.passengerId || !job.passengerPhone || !job.passengerName || !job.stopName) {
        console.error('[AlertWorker] Invalid job payload — required fields missing:', job);
        consecutiveErrors = 0;
        continue;
      }

      console.log(`[AlertWorker] Processing job for ${job.passengerName} (${job.passengerPhone}) → stop "${job.stopName}"`);

      await runAlertCascade(job);

      consecutiveErrors = 0;   // reset on success

    } catch (err: any) {
      consecutiveErrors++;
      const backoff = calcBackoff(consecutiveErrors);
      console.error(
        `[AlertWorker] Error (attempt ${consecutiveErrors}) — backing off ${backoff}ms:`,
        err?.message
      );
      await sleep(backoff);
    }
  }

  console.log('[AlertWorker] Shutting down gracefully');
  process.exit(0);
}

main();
