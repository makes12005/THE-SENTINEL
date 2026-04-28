"use strict";
/**
 * AlertOrchestrator
 *
 * Runs the full delivery cascade for one alert job:
 *   Call (x2) → SMS → WhatsApp → Socket.IO manual trigger
 *
 * Every attempt is written to alert_logs.
 * On first success, updates trip_passengers.alert_status/channel/sent_at.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAlertCascade = runAlertCascade;
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const call_service_1 = require("./call.service");
const sms_service_1 = require("./sms.service");
const whatsapp_service_1 = require("./whatsapp.service");
const socket_1 = require("../../lib/socket");
async function writeLog(passengerId, channel, status, responseCode, errorMessage) {
    await db_1.db.insert(schema_1.alertLogs).values({
        trip_passenger_id: passengerId,
        channel,
        status,
        attempted_at: new Date(),
        response_code: responseCode ?? null,
        error_message: errorMessage ?? null,
    });
}
async function markDelivered(passengerId, channel) {
    await db_1.db
        .update(schema_1.tripPassengers)
        .set({
        alert_status: 'sent',
        alert_channel: channel,
        alert_sent_at: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.tripPassengers.id, passengerId));
}
/**
 * Entry point called by the alert worker for each dequeued job.
 */
async function runAlertCascade(job) {
    const { tripId, passengerId, passengerPhone, stopName, passengerName } = job;
    const tag = `[Alert ${passengerId.slice(0, 8)}]`;
    // ── 1. Exotel Call (up to 2 attempts, internal 30s gap) ─────────────────────
    console.log(`${tag} Attempting Exotel call → ${passengerPhone}`);
    const callResult = await (0, call_service_1.triggerCall)(passengerPhone, stopName);
    if (callResult.ok) {
        await writeLog(passengerId, 'call', 'success', callResult.callSid ?? String(callResult.statusCode));
        await markDelivered(passengerId, 'call');
        console.log(`${tag} ✅ Delivered via call`);
        return;
    }
    await writeLog(passengerId, 'call', 'failed', String(callResult.statusCode ?? ''), callResult.errorMessage);
    console.warn(`${tag} Call failed: ${callResult.errorMessage}`);
    // ── 2. MSG91 SMS ─────────────────────────────────────────────────────────────
    console.log(`${tag} Attempting MSG91 SMS → ${passengerPhone}`);
    const smsResult = await (0, sms_service_1.triggerSMS)(passengerPhone, stopName);
    if (smsResult.ok) {
        await writeLog(passengerId, 'sms', 'success', smsResult.requestId ?? String(smsResult.statusCode));
        await markDelivered(passengerId, 'sms');
        console.log(`${tag} ✅ Delivered via SMS`);
        return;
    }
    await writeLog(passengerId, 'sms', 'failed', String(smsResult.statusCode ?? ''), smsResult.errorMessage);
    console.warn(`${tag} SMS failed: ${smsResult.errorMessage}`);
    // ── 3. Gupshup WhatsApp ──────────────────────────────────────────────────────
    console.log(`${tag} Attempting Gupshup WhatsApp → ${passengerPhone}`);
    const waResult = await (0, whatsapp_service_1.triggerWhatsApp)(passengerPhone, stopName);
    if (waResult.ok) {
        await writeLog(passengerId, 'whatsapp', 'success', waResult.messageId ?? String(waResult.statusCode));
        await markDelivered(passengerId, 'whatsapp');
        console.log(`${tag} ✅ Delivered via WhatsApp`);
        return;
    }
    await writeLog(passengerId, 'whatsapp', 'failed', String(waResult.statusCode ?? ''), waResult.errorMessage);
    console.warn(`${tag} WhatsApp failed: ${waResult.errorMessage}`);
    // ── 4. Socket.IO — conductor manual notification ─────────────────────────────
    console.warn(`${tag} All automated channels failed — emitting manual alert to conductor`);
    try {
        const [trip] = await db_1.db
            .select({ conductor_id: schema_1.trips.conductor_id })
            .from(schema_1.trips)
            .where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId))
            .limit(1);
        const conductorId = trip?.conductor_id;
        if (conductorId) {
            await (0, socket_1.emitSocketEvent)(`user:${conductorId}`, 'alert_manual_required', {
                passengerId,
                passengerName,
                passengerPhone,
                stopName,
            });
        }
    }
    catch (socketErr) {
        console.error(`${tag} Socket.IO emit failed:`, socketErr?.message);
    }
    await writeLog(passengerId, 'manual', 'failed', undefined, 'All automated channels failed');
    // Mark as failed so ops team can see it in dashboard
    await db_1.db
        .update(schema_1.tripPassengers)
        .set({ alert_status: 'failed' })
        .where((0, drizzle_orm_1.eq)(schema_1.tripPassengers.id, passengerId));
}
