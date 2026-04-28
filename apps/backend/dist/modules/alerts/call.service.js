"use strict";
/**
 * CallService — Exotel outbound call trigger
 *
 * POST https://api.exotel.com/v1/Accounts/{SID}/Calls/connect.json
 * Uses HTTP Basic Auth: API_KEY:API_TOKEN
 *
 * Retry strategy (per exotel-calls skill):
 *   Attempt 1 → wait 30s → Attempt 2
 *   Both fail → return { ok: false }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerCall = triggerCall;
const EXOTEL_SID = process.env.EXOTEL_SID;
const EXOTEL_API_KEY = process.env.EXOTEL_API_KEY;
const EXOTEL_API_TOKEN = process.env.EXOTEL_API_TOKEN;
const EXOTEL_CALLER_ID = process.env.EXOTEL_CALLER_ID;
// Flow/App SID that reads out the TTS message on answered calls
const EXOTEL_FLOW_ID = process.env.EXOTEL_FLOW_ID;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function attemptCall(to, stopName) {
    const isMock = process.env.ALERT_PROVIDER === "mock";
    if (isMock) {
        console.log(`[Mock Exotel] Ringing ${to} for pattern ${stopName}...`);
        return { ok: true, callSid: "mock_call_sid", statusCode: 200 };
    }
    const url = `https://${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}@api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/connect.json`;
    const body = new URLSearchParams({
        From: EXOTEL_CALLER_ID,
        To: to,
        CallerId: EXOTEL_CALLER_ID,
        Url: `http://my.exotel.com/exotel/tts/bus-stop-alert`,
        CustomField: encodeURIComponent(stopName),
        TimeLimit: '60',
        TimeOut: '20',
    });
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
            return {
                ok: true,
                callSid: json?.Call?.Sid,
                statusCode: res.status,
            };
        }
        return {
            ok: false,
            statusCode: res.status,
            errorMessage: json?.RestException?.Message ?? `HTTP ${res.status}`,
        };
    }
    catch (err) {
        return {
            ok: false,
            errorMessage: err?.message ?? 'Network error',
        };
    }
}
/**
 * Triggers up to 2 Exotel call attempts with 30-second gap.
 * Returns the first successful result or the last failure.
 */
async function triggerCall(phone, stopName) {
    const attempt1 = await attemptCall(phone, stopName);
    if (attempt1.ok)
        return attempt1;
    console.warn(`[CallService] Attempt 1 failed for ${phone} — waiting 30s`);
    await sleep(30000);
    const attempt2 = await attemptCall(phone, stopName);
    return attempt2;
}
