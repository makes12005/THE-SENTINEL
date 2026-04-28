"use strict";
/**
 * WhatsAppService — Gupshup fallback when MSG91 SMS fails.
 *
 * POST https://api.gupshup.io/sm/api/v1/msg
 * Uses Gupshup App-Name + Source number for the outbound message.
 *
 * If Gupshup returns non-2xx → return { ok: false }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerWhatsApp = triggerWhatsApp;
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
const GUPSHUP_SOURCE_NUMBER = process.env.GUPSHUP_SOURCE_NUMBER; // WhatsApp business number
const GUPSHUP_APP_NAME = process.env.GUPSHUP_APP_NAME;
/**
 * Sends a plain-text WhatsApp message via Gupshup.
 */
async function triggerWhatsApp(phone, stopName) {
    // Gupshup expects 12-digit format: 91XXXXXXXXXX (no +)
    const destination = phone.replace(/^\+/, '');
    const message = `BusAlert: Your stop ${stopName} is arriving soon. Please prepare to deboard.`;
    const body = new URLSearchParams({
        channel: 'whatsapp',
        source: GUPSHUP_SOURCE_NUMBER,
        destination,
        'src.name': GUPSHUP_APP_NAME,
        message: JSON.stringify({ type: 'text', text: message }),
    });
    try {
        const res = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
            method: 'POST',
            headers: {
                apikey: GUPSHUP_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.status === 'submitted') {
            return {
                ok: true,
                messageId: json?.messageId,
                statusCode: res.status,
            };
        }
        return {
            ok: false,
            statusCode: res.status,
            errorMessage: json?.message ?? `HTTP ${res.status}`,
        };
    }
    catch (err) {
        return {
            ok: false,
            errorMessage: err?.message ?? 'Network error',
        };
    }
}
