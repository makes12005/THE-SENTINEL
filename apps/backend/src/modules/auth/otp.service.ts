import { redis } from '../../lib/redis';

export interface OTPResult {
  ok: boolean;
  errorMessage?: string;
  statusCode?: number;
}

export interface OTPVerificationResult {
  ok: boolean;
  attemptsRemaining: number;
  expired: boolean;
}

// Ensure these exist in environment
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID;
const MSG91_OTP_TEMPLATE_ID = process.env.MSG91_OTP_TEMPLATE_ID; // Provide a template ID for OTPs
const BREVO_API_KEY = process.env.BREVO_API_KEY;

const OTP_TTL = 300; // 5 minutes
const MAX_ATTEMPTS = 3;

/** Returns true when the string looks like an e-mail address */
function isEmail(id: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id.trim());
}

export class OTPService {
  /**
   * Generates a 6-digit random OTP.
   */
  static generateOTP(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  /**
   * Stores the OTP and initializes attempt count in Redis.
   */
  static async storeOTP(contact: string, otp: string): Promise<void> {
    const key = `otp:${contact}`;
    const payload = JSON.stringify({ otp, attempts: 0 });
    await redis.set(key, payload, 'EX', OTP_TTL);
  }

  /**
   * Dispatches the OTP either via Email or SMS.
   */
  static async sendOTP(contact: string, otp: string): Promise<OTPResult> {
    const channel = isEmail(contact) ? 'email' : 'sms';
    console.log('Sending OTP to:', contact);
    console.log('Channel:', channel);
    if (process.env.NODE_ENV !== 'production') {
      console.log('OTP:', otp);
    }

    if (channel === 'email') {
      return this.sendViaEmail(contact, otp);
    } else {
      return this.sendViaSMS(contact, otp);
    }
  }

  /**
   * Verifies the provided OTP against Redis.
   * Returns a structured result so handlers can show attempts remaining.
   */
  static async verifyOTP(contact: string, inputOtp: string): Promise<OTPVerificationResult> {
    const key = `otp:${contact}`;
    const storedStr = await redis.get(key);

    if (!storedStr) {
      return { ok: false, attemptsRemaining: 0, expired: true };
    }

    try {
      const data = JSON.parse(storedStr);
      if (data.attempts >= MAX_ATTEMPTS) {
        await redis.del(key);
        return { ok: false, attemptsRemaining: 0, expired: true };
      }

      if (data.otp === inputOtp) {
        await redis.del(key);
        return {
          ok: true,
          attemptsRemaining: Math.max(MAX_ATTEMPTS - data.attempts, 0),
          expired: false,
        };
      }

      data.attempts += 1;
      const attemptsRemaining = Math.max(MAX_ATTEMPTS - data.attempts, 0);

      if (attemptsRemaining === 0) {
        await redis.del(key);
      } else {
        await redis.set(key, JSON.stringify(data), 'KEEPTTL');
      }

      return { ok: false, attemptsRemaining, expired: false };
    } catch {
      return { ok: false, attemptsRemaining: 0, expired: true };
    }
  }

  private static async sendViaEmail(email: string, otp: string): Promise<OTPResult> {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY not configured. Falling back to dev-mode delivery.');
      return { ok: true };
    }

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { email: 'noreply@busalert.in', name: 'Bus Alert' },
          to: [{ email: email }],
          subject: 'Your Bus Alert verification code',
          htmlContent: `<p>Your OTP is: <strong>${otp}</strong>. Valid for 5 minutes.</p>`,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.log('Provider response:', errorText);
        console.error('Failed to send email via Brevo:', errorText);
        return { ok: false, errorMessage: 'Failed to send email OTP', statusCode: res.status };
      }

      console.log('Provider response:', `brevo status ${res.status}`);
      return { ok: true };
    } catch (err: any) {
      console.error('Email delivery error:', err);
      return { ok: false, errorMessage: err?.message || 'Network error' };
    }
  }

  private static async sendViaSMS(phone: string, otp: string): Promise<OTPResult> {
    if (!MSG91_AUTH_KEY || !MSG91_OTP_TEMPLATE_ID) {
      console.warn('MSG91 keys missing. Falling back to dev-mode delivery.');
      return { ok: true };
    }

    // MSG91 expects 10-digit number for India; strip the +91 prefix
    const mobile = phone.replace(/^\+91/, '');

    const payload = {
      flow_id: MSG91_OTP_TEMPLATE_ID,
      sender: MSG91_SENDER_ID,
      mobiles: `91${mobile}`,
      otp: otp, // Assuming the template expects {{otp}}
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
      console.log('Provider response:', json);

      if (res.ok && json?.type === 'success') {
        return { ok: true };
      }

      console.error('Failed to send SMS:', json);
      return { ok: false, errorMessage: json?.message || 'Failed to send SMS OTP', statusCode: res.status };
    } catch (err: any) {
      console.error('SMS delivery error:', err);
      return { ok: false, errorMessage: err?.message || 'Network error' };
    }
  }
}
