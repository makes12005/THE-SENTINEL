/**
 * AlertOrchestrator
 *
 * Runs the full delivery cascade for one alert job:
 *   Call (x2) → SMS → WhatsApp → Socket.IO manual trigger
 *
 * Every attempt is written to alert_logs.
 * On first success, updates trip_passengers.alert_status/channel/sent_at.
 */

import { db } from '../../db';
import { alertLogs, tripPassengers, trips } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { triggerCall }     from './call.service';
import { triggerSMS }      from './sms.service';
import { triggerWhatsApp } from './whatsapp.service';
import { emitSocketEvent } from '../../lib/socket';

export interface AlertJob {
  tripId: string;
  passengerId: string;
  passengerPhone: string;
  stopName: string;
  passengerName: string;
}

type Channel = 'call' | 'sms' | 'whatsapp' | 'manual';
type LogStatus = 'success' | 'failed';

async function writeLog(
  passengerId: string,
  channel: Channel,
  status: LogStatus,
  responseCode?: string,
  errorMessage?: string
) {
  await db.insert(alertLogs).values({
    trip_passenger_id: passengerId,
    channel,
    status,
    attempted_at: new Date(),
    response_code: responseCode ?? null,
    error_message: errorMessage ?? null,
  });
}

async function markDelivered(passengerId: string, channel: Channel) {
  await db
    .update(tripPassengers)
    .set({
      alert_status: 'sent',
      alert_channel: channel,
      alert_sent_at: new Date(),
    })
    .where(eq(tripPassengers.id, passengerId));
}

/**
 * Entry point called by the alert worker for each dequeued job.
 */
export async function runAlertCascade(job: AlertJob): Promise<void> {
  const { tripId, passengerId, passengerPhone, stopName, passengerName } = job;

  const tag = `[Alert ${passengerId.slice(0, 8)}]`;

  // ── 1. Exotel Call (up to 2 attempts, internal 30s gap) ─────────────────────
  console.log(`${tag} Attempting Exotel call → ${passengerPhone}`);
  const callResult = await triggerCall(passengerPhone, stopName);

  if (callResult.ok) {
    await writeLog(passengerId, 'call', 'success', callResult.callSid ?? String(callResult.statusCode));
    await markDelivered(passengerId, 'call');
    console.log(`${tag} ✅ Delivered via call`);
    return;
  }

  await writeLog(
    passengerId, 'call', 'failed',
    String(callResult.statusCode ?? ''),
    callResult.errorMessage
  );
  console.warn(`${tag} Call failed: ${callResult.errorMessage}`);

  // ── 2. MSG91 SMS ─────────────────────────────────────────────────────────────
  console.log(`${tag} Attempting MSG91 SMS → ${passengerPhone}`);
  const smsResult = await triggerSMS(passengerPhone, stopName);

  if (smsResult.ok) {
    await writeLog(passengerId, 'sms', 'success', smsResult.requestId ?? String(smsResult.statusCode));
    await markDelivered(passengerId, 'sms');
    console.log(`${tag} ✅ Delivered via SMS`);
    return;
  }

  await writeLog(
    passengerId, 'sms', 'failed',
    String(smsResult.statusCode ?? ''),
    smsResult.errorMessage
  );
  console.warn(`${tag} SMS failed: ${smsResult.errorMessage}`);

  // ── 3. Gupshup WhatsApp ──────────────────────────────────────────────────────
  console.log(`${tag} Attempting Gupshup WhatsApp → ${passengerPhone}`);
  const waResult = await triggerWhatsApp(passengerPhone, stopName);

  if (waResult.ok) {
    await writeLog(passengerId, 'whatsapp', 'success', waResult.messageId ?? String(waResult.statusCode));
    await markDelivered(passengerId, 'whatsapp');
    console.log(`${tag} ✅ Delivered via WhatsApp`);
    return;
  }

  await writeLog(
    passengerId, 'whatsapp', 'failed',
    String(waResult.statusCode ?? ''),
    waResult.errorMessage
  );
  console.warn(`${tag} WhatsApp failed: ${waResult.errorMessage}`);

  // ── 4. Socket.IO — conductor manual notification ─────────────────────────────
  console.warn(`${tag} All automated channels failed — emitting manual alert to conductor`);

  try {
    const [trip] = await db
      .select({ conductor_id: trips.conductor_id })
      .from(trips)
      .where(eq(trips.id, tripId))
      .limit(1);

    const conductorId = trip?.conductor_id;

    if (conductorId) {
      await emitSocketEvent(`user:${conductorId}`, 'alert_manual_required', {
        passengerId,
        passengerName,
        passengerPhone,
        stopName,
      });
    }
  } catch (socketErr: any) {
    console.error(`${tag} Socket.IO emit failed:`, socketErr?.message);
  }

  await writeLog(passengerId, 'manual', 'failed', undefined, 'All automated channels failed');
  // Mark as failed so ops team can see it in dashboard
  await db
    .update(tripPassengers)
    .set({ alert_status: 'failed' })
    .where(eq(tripPassengers.id, passengerId));
}
