/**
 * SMSService — MSG91 fallback when both Exotel calls fail.
 *
 * POST https://api.msg91.com/api/v5/flow/
 * Uses sender-id + template/flow for DLT compliance.
 *
 * If MSG91 returns non-2xx → return { ok: false }
 * No retries — caller (orchestrator) decides escalation.
 */

export interface SMSResult {
  ok: boolean;
  requestId?: string;
  statusCode?: number;
  errorMessage?: string;
}

const MSG91_AUTH_KEY  = process.env.MSG91_AUTH_KEY!;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID!;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID!;   // DLT approved template

/**
 * Sends an SMS via MSG91 Flow API.
 * The stop name is injected into the DLT template via "VAR1".
 */
export async function triggerSMS(
  phone: string,
  stopName: string
): Promise<SMSResult> {
  // MSG91 expects 10-digit number for India; strip the +91 prefix
  const mobile = phone.replace(/^\+91/, '');

  const payload = {
    flow_id: MSG91_TEMPLATE_ID,
    sender: MSG91_SENDER_ID,
    mobiles: `91${mobile}`,
    stop_name: stopName,                  // template variable {{stop_name}}
  };

  try {
    const res = await fetch('https://api.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        authkey: MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json: any = await res.json().catch(() => ({}));

    if (res.ok && json?.type === 'success') {
      return {
        ok: true,
        requestId: json?.request_id,
        statusCode: res.status,
      };
    }

    return {
      ok: false,
      statusCode: res.status,
      errorMessage: json?.message ?? `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      errorMessage: err?.message ?? 'Network error',
    };
  }
}
