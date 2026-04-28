"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const path_1 = __importDefault(require("path"));
// Ensure .env is loaded from monorepo root before any service imports
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: path_1.default.join(__dirname, '../../../.env') });
const redis_1 = require("../lib/redis");
const alert_orchestrator_1 = require("../modules/alerts/alert.orchestrator");
const QUEUE_KEY = 'alert_queue';
const BLPOP_TIMEOUT = 5; // seconds — re-checks for clean shutdown every 5s
let isShuttingDown = false;
process.on('SIGTERM', () => { isShuttingDown = true; });
process.on('SIGINT', () => { isShuttingDown = true; });
/**
 * Exponential backoff — doubles on each consecutive failure, cap 60s, reset on success.
 */
function calcBackoff(consecutiveErrors) {
    return Math.min(1000 * Math.pow(2, consecutiveErrors), 60000);
}
async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
async function main() {
    console.log('Alert worker started');
    console.log('Waiting for jobs...');
    let consecutiveErrors = 0;
    while (!isShuttingDown) {
        try {
            // BLPOP returns null on timeout or [key, value] on success
            const result = await redis_1.redis.blpop(QUEUE_KEY, BLPOP_TIMEOUT);
            if (!result)
                continue; // timeout — loop again
            const [, rawJob] = result;
            let job;
            try {
                const parsed = JSON.parse(rawJob);
                // Backward-compatible mapping for legacy queue payloads.
                job = {
                    tripId: parsed.tripId ?? parsed.trip_id,
                    passengerId: parsed.passengerId ?? parsed.tripPassengerId ?? parsed.passenger_id,
                    passengerPhone: parsed.passengerPhone ?? parsed.passenger_phone,
                    passengerName: parsed.passengerName ?? parsed.passenger_name,
                    stopName: parsed.stopName ?? parsed.stop_name,
                };
            }
            catch {
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
            await (0, alert_orchestrator_1.runAlertCascade)(job);
            consecutiveErrors = 0; // reset on success
        }
        catch (err) {
            consecutiveErrors++;
            const backoff = calcBackoff(consecutiveErrors);
            console.error(`[AlertWorker] Error (attempt ${consecutiveErrors}) — backing off ${backoff}ms:`, err?.message);
            await sleep(backoff);
        }
    }
    console.log('[AlertWorker] Shutting down gracefully');
    process.exit(0);
}
main();
