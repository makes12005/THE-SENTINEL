import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { and, eq, gt, or } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../db';
import { auditLogs, refreshTokens, users, agencies, agencyInvites, agencyWallets } from '../../db/schema';
import { PREFIX_BLACKLIST, redis } from '../../lib/redis';
import { requireAuth } from './auth.middleware';
import { OTPService } from './otp.service';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Returns true when the string looks like an e-mail address */
function isEmail(id: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id.trim());
}

/**
 * Normalise a phone number to E.164 (+91XXXXXXXXXX for India).
 * Accepts: "9876543210", "09876543210", "+919876543210", "91-9876543210"
 */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  // already well-formed or foreign number â€” prepend + if missing
  return raw.startsWith('+') ? raw : `+${digits}`;
}

type DbUser = typeof users.$inferSelect;
type TokenPayload = jwt.JwtPayload & {
  role?: string;
  agencyId?: string | null;
  agency_id?: string | null;
  name?: string;
};

const ROLE_REDIRECTS: Record<string, string> = {
  admin:     '/admin/dashboard',
  owner:     '/owner/dashboard',
  operator:  '/operator/dashboard',
  driver:    '/operator/dashboard',
  conductor: '/operator/dashboard',
  passenger: '/access-code',
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error('REFRESH_TOKEN_SECRET is not configured');
  return secret;
}

function serializeUser(user: DbUser) {
  return {
    id:       user.id,
    name:     user.name,
    phone:    user.phone ?? null,
    email:    user.email ?? null,
    role:     user.role,
    agency_id: user.agency_id ?? null,
    agencyId: user.agency_id ?? null,
    redirect: ROLE_REDIRECTS[user.role] ?? '/operator/dashboard',
  };
}

function getContactFromBody(body: Record<string, unknown> | undefined): string {
  const raw =
    (typeof body?.contact === 'string' && body.contact) ||
    (typeof body?.identifier === 'string' && body.identifier) ||
    (typeof body?.phone === 'string' && body.phone) ||
    (typeof body?.email === 'string' && body.email) ||
    '';

  return raw.trim();
}

function normalizeContact(raw: string): string {
  return isEmail(raw) ? raw.toLowerCase().trim() : normalisePhone(raw);
}

function isIndianPhoneLike(raw: string): boolean {
  const normalized = raw.trim();
  return /^(\+91\d{10}|\d{10})$/.test(normalized);
}

async function issueTokens(user: DbUser) {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role, agencyId: user.agency_id, name: user.name },
    getJwtSecret(),
    { expiresIn: '15m', subject: user.id }
  );

  const refreshToken = jwt.sign(
    { role: user.role, agencyId: user.agency_id, type: 'refresh' },
    getRefreshSecret(),
    { expiresIn: '30d', subject: user.id }
  );

  await db.insert(refreshTokens).values({
    user_id:    user.id,
    token_hash: hashToken(refreshToken),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  return { accessToken, refreshToken };
}

async function revokeAccessToken(token?: string | null) {
  if (!token) return;
  try {
    const payload = jwt.verify(token, getJwtSecret()) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max((payload.exp ?? now) - now, 1);
    await redis.set(`${PREFIX_BLACKLIST}${token}`, '1', 'EX', ttl);
  } catch {
    // Best-effort; ignore expired or malformed tokens.
  }
}

/** Find a user by either phone or email */
async function findUserByIdentifier(identifier: string): Promise<DbUser | undefined> {
  if (isEmail(identifier)) {
    const [u] = await db.select().from(users).where(eq(users.email, identifier.toLowerCase().trim())).limit(1);
    return u;
  }
  const phone = normalisePhone(identifier);
  const [u] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return u;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Route plugin
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const authRoutes: FastifyPluginAsync = async (fastify) => {

  // â”€â”€ POST /login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post('/login', async (request, reply) => {
    const schema = z.object({
      contact:    z.string().min(3).optional(),
      identifier: z.string().min(3).optional(),
      password:   z.string().min(1),
      // legacy field names â€” kept for backwards compat
      phone:      z.string().optional(),
      email:      z.string().email().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Phone/email and password are required' },
      });
    }

    // Accept "identifier" OR legacy "phone" field
    const raw = getContactFromBody(parsed.data);
    const user = await findUserByIdentifier(raw);

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'No account found. Check your phone/email.' },
      });
    }

    if (!user.is_active) {
      return reply.status(403).send({
        success: false,
        error: { code: 'USER_DISABLED', message: 'Your account has been disabled' },
      });
    }

    const passwordOk = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!passwordOk) {
      await db.insert(auditLogs).values({
        user_id:     user.id,
        action:      'LOGIN_FAILED',
        entity_type: 'auth',
        entity_id:   user.id,
        metadata:    { reason: 'invalid_password' },
        ip_address:  request.ip,
      });
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect password' },
      });
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.user_id, user.id));
    const tokens = await issueTokens(user);

    await db.insert(auditLogs).values({
      user_id:     user.id,
      action:      'LOGIN_SUCCESS',
      entity_type: 'auth',
      entity_id:   user.id,
      metadata:    { role: user.role },
      ip_address:  request.ip,
    });

    return {
      success: true,
      data: {
        access_token:  tokens.accessToken,
        accessToken:   tokens.accessToken,
        refresh_token: tokens.refreshToken,
        refreshToken:  tokens.refreshToken,
        user:          serializeUser(user),
      },
    };
  });

  // â”€â”€ POST /refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post('/refresh', async (request, reply) => {
    const schema = z.object({
      refreshToken: z.string().min(1).optional(),
      refresh_token: z.string().min(1).optional(),
    }).refine((data) => Boolean(data.refreshToken || data.refresh_token), {
      message: 'refreshToken or refresh_token is required',
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'refreshToken is required' },
      });
    }

    const refreshToken = parsed.data.refreshToken || parsed.data.refresh_token;
    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'refreshToken or refresh_token is required' },
      });
    }

    let payload: TokenPayload;
    try {
      payload = jwt.verify(refreshToken, getRefreshSecret()) as TokenPayload;
    } catch (error: any) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: error?.message ?? 'Invalid refresh token' },
      });
    }

    const userId = payload.sub;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Token subject missing' },
      });
    }

    const tokenHash = hashToken(refreshToken);
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.user_id, userId),
        eq(refreshTokens.token_hash, tokenHash),
        gt(refreshTokens.expires_at, new Date()),
      ))
      .limit(1);

    if (!stored) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Token expired or revoked' },
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || !user.is_active) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'User unavailable' },
      });
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
    const tokens = await issueTokens(user);

    return {
      success: true,
      data: {
        access_token:  tokens.accessToken,
        accessToken:   tokens.accessToken,
        refresh_token: tokens.refreshToken,
        refreshToken:  tokens.refreshToken,
        user:          serializeUser(user),
      },
    };
  });

  // â”€â”€ POST /logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post('/logout', async (request, reply) => {
    const schema = z.object({
      refreshToken: z.string().min(1).optional(),
      refresh_token: z.string().min(1).optional(),
    }).optional();
    const parsed = schema.safeParse(request.body);

    const authHeader = request.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    await revokeAccessToken(accessToken);

    const refreshToken = parsed.success
      ? parsed.data?.refreshToken || parsed.data?.refresh_token
      : null;

    if (refreshToken) {
      await db.delete(refreshTokens).where(eq(refreshTokens.token_hash, hashToken(refreshToken)));
    }

    return reply.send({ success: true, data: { loggedOut: true } });
  });

  // â”€â”€ GET /me â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get('/me', { preHandler: requireAuth() }, async (request) => {
    return { success: true, data: (request as any).user };
  });

  // â”€â”€ POST /change-password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post('/change-password', { preHandler: requireAuth() }, async (request, reply) => {
    const schema = z.object({
      current_password: z.string().min(1),
      new_password:     z.string().min(8),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'current_password and new_password (min 8) required' },
      });
    }

    const authUser = (request as any).user as { id: string };
    const [user] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
    if (!user) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const ok = await bcrypt.compare(parsed.data.current_password, user.password_hash);
    if (!ok) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Current password incorrect' } });
    }

    const hash = await bcrypt.hash(parsed.data.new_password, 12);
    await db.update(users).set({ password_hash: hash }).where(eq(users.id, user.id));
    await db.delete(refreshTokens).where(eq(refreshTokens.user_id, user.id));

    await db.insert(auditLogs).values({
      user_id:     user.id,
      action:      'PASSWORD_CHANGED',
      entity_type: 'auth',
      entity_id:   user.id,
      metadata:    { changed_at: new Date().toISOString() },
      ip_address:  request.ip,
    });

    return { success: true, data: { changed: true } };
  });

  // â”€â”€ POST /register â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Accepts: { name, identifier/contact/phone/email, password }
  // Contact is auto-detected as phone or email and normalized to canonical form.
  fastify.post('/register', async (request, reply) => {
    console.log('Register body:', request.body);
    const schema = z.object({
      name:       z.string().min(2).max(255),
      identifier: z.string().min(3).optional(),
      contact:    z.string().min(3).optional(),
      password:   z.string().min(8),
      // legacy fields â€” kept for backwards compat
      phone:      z.string().optional(),
      email:      z.string().email().optional(),
    }).superRefine((data, ctx) => {
      const rawContact = getContactFromBody(data);
      if (!rawContact) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'identifier/contact/phone/email is required',
          path: ['identifier'],
        });
        return;
      }
      if (!isEmail(rawContact) && !isIndianPhoneLike(rawContact)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Phone must be 10 digits or +91 followed by 10 digits',
          path: ['identifier'],
        });
      }
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      console.log('Validation error:', parsed.error.format());
      return reply.status(400).send({
        success: false,
        error: {
          code:    'VALIDATION_ERROR',
          message: 'name, contact (phone/email), and password (min 8 chars) required',
          details: parsed.error.format(),
        },
      });
    }

    const { name, password } = parsed.data;
    const raw = getContactFromBody(parsed.data);
    const identIsEmail = isEmail(raw);

    // Resolve to canonical form
    const phone: string | null  = identIsEmail ? null  : normalisePhone(raw);
    const email: string | null  = identIsEmail ? raw.toLowerCase().trim() : (parsed.data.email?.toLowerCase() ?? null);

    // Duplicate check
    if (phone) {
      const [dup] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (dup) {
        return reply.status(409).send({
          success: false,
          error: { code: 'PHONE_TAKEN', message: 'An account with this phone number already exists' },
        });
      }
    }
    if (email) {
      const [dup] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (dup) {
        return reply.status(409).send({
          success: false,
          error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists' },
        });
      }
    }

    const password_hash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({
      name,
      phone:         phone ?? undefined,
      email:         email ?? undefined,
      password_hash,
      role:          'passenger',
      is_active:     true,
    }).returning();
    const tokens = await issueTokens(user);

    await db.insert(auditLogs).values({
      user_id:     user.id,
      action:      'REGISTER',
      entity_type: 'auth',
      entity_id:   user.id,
      metadata:    { role: 'passenger', identifier_type: identIsEmail ? 'email' : 'phone' },
      ip_address:  request.ip,
    });

    return reply.status(200).send({
      success: true,
      data: {
        access_token:  tokens.accessToken,
        accessToken:   tokens.accessToken,
        refresh_token: tokens.refreshToken,
        refreshToken:  tokens.refreshToken,
        user:          serializeUser(user),
      },
    });
  });

  // â”€â”€ POST /send-otp â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Accepts: { identifier } â€” phone or email.
  fastify.post('/send-otp', async (request, reply) => {
    const schema = z.object({
      contact: z.string().min(3).optional(),
      identifier: z.string().min(3).optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'contact is required' },
      });
    }

    const raw = getContactFromBody(parsed.data);
    const key = normalizeContact(raw);
    
    // Rate limit check
    const rlKey = `rl:otp:${key}`;
    const attemptsStr = await redis.get(rlKey);
    const attempts = parseInt(attemptsStr || '0', 10);
    if (attempts >= 3) {
      return reply.status(429).send({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Too many OTP requests. Try again later.' }
      });
    }
    await redis.set(rlKey, String(attempts + 1), 'EX', 3600); // 1 hour window

    const otp = OTPService.generateOTP();
    await OTPService.storeOTP(key, otp);

    fastify.log.info({ identifier: key, otp }, 'OTP generated');

    const result = await OTPService.sendOTP(key, otp);
    const isDev = process.env.NODE_ENV !== 'production';

    return reply.send({
      success: true,
      data: {
        channel: isEmail(raw) ? 'email' : 'sms',
        message: isEmail(raw)
          ? 'OTP sent to your email'
          : 'OTP sent to your phone',
        identifier_type: isEmail(raw) ? 'email' : 'phone',
        ...(isDev && { otp }), // Only leak OTP in dev
      },
    });
  });

  // â”€â”€ POST /verify-otp â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post('/verify-otp', async (request, reply) => {
    const schema = z.object({
      contact: z.string().min(3).optional(),
      identifier: z.string().min(3).optional(),
      otp:        z.string().length(6),
      phone:      z.string().optional(),
      email:      z.string().email().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'contact and 6-digit OTP are required' },
      });
    }

    const raw = getContactFromBody(parsed.data);
    const key = normalizeContact(raw);

    const verification = await OTPService.verifyOTP(key, parsed.data.otp);
    if (!verification.ok) {
      return reply.status(401).send({
        success: false,
        error: {
          code: verification.expired ? 'OTP_EXPIRED' : 'INVALID_OTP',
          message: verification.expired ? 'OTP expired. Request a new code.' : 'Invalid OTP.',
        },
        data: {
          attempts_remaining: verification.attemptsRemaining,
        },
      });
    }

    // If user doesn't exist, issue a temporary token for signup
    const tempToken = jwt.sign(
      { contact: key, identifier: key, type: 'signup_temp' },
      getJwtSecret(),
      { expiresIn: '15m' }
    );

    return reply.send({
      success: true,
      data: {
        temp_token: tempToken,
        message: 'Proceed to signup'
      },
    });
  });

  fastify.post('/login-otp', async (request, reply) => {
    const schema = z.object({
      contact: z.string().min(3).optional(),
      identifier: z.string().min(3).optional(),
      otp: z.string().length(6),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'contact and 6-digit OTP are required' },
      });
    }

    const raw = getContactFromBody(parsed.data);
    const key = normalizeContact(raw);
    const verification = await OTPService.verifyOTP(key, parsed.data.otp);

    if (!verification.ok) {
      return reply.status(401).send({
        success: false,
        error: {
          code: verification.expired ? 'OTP_EXPIRED' : 'INVALID_OTP',
          message: verification.expired ? 'OTP expired. Request a new code.' : 'Invalid OTP.',
        },
        data: {
          attempts_remaining: verification.attemptsRemaining,
        },
      });
    }

    const user = await findUserByIdentifier(key);
    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'No account found for this contact' },
      });
    }

    if (!user.is_active) {
      return reply.status(403).send({
        success: false,
        error: { code: 'USER_DISABLED', message: 'Your account has been disabled' },
      });
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.user_id, user.id));
    const tokens = await issueTokens(user);

    await db.insert(auditLogs).values({
      user_id:     user.id,
      action:      'OTP_LOGIN',
      entity_type: 'auth',
      entity_id:   user.id,
      metadata:    { contact: key },
      ip_address:  request.ip,
    });

    return reply.send({
      success: true,
      data: {
        access_token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        refreshToken: tokens.refreshToken,
        user: serializeUser(user),
      },
    });
  });

  // â”€â”€ POST /signup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post('/signup', async (request, reply) => {
    console.log('Signup body:', request.body);
    const schema = z.object({
      name: z.string().min(2).max(255),
      contact: z.string().min(3).optional(),
      password: z.string().min(8),
      temp_token: z.string().min(1),
      agency_invite_code: z.string().optional(),
      invite_code: z.string().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      console.log('Validation error:', parsed.error.format());
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid payload' },
      });
    }

    let payload: any;
    try {
      payload = jwt.verify(parsed.data.temp_token, getJwtSecret());
      if (payload.type !== 'signup_temp') throw new Error();
    } catch {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_TEMP_TOKEN', message: 'Temporary token is invalid or expired. Verify OTP again.' }
      });
    }

    const key = payload.contact || payload.identifier;
    if (!key) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_TEMP_TOKEN', message: 'Temporary token is missing contact details.' }
      });
    }

    if (parsed.data.contact && normalizeContact(parsed.data.contact) !== key) {
      return reply.status(400).send({
        success: false,
        error: { code: 'CONTACT_MISMATCH', message: 'Provided contact does not match verified OTP contact' }
      });
    }

    const identIsEmail = isEmail(key);
    const phone = identIsEmail ? null : key;
    const email = identIsEmail ? key : null;

    // Check agency invite code if provided
    let agencyId: string | undefined;
    const inviteCode = parsed.data.agency_invite_code || parsed.data.invite_code;
    if (inviteCode) {
      const [ag] = await db.select().from(agencies).where(eq(agencies.invite_code, inviteCode)).limit(1);
      if (!ag) {
        return reply.status(404).send({
          success: false,
          error: { code: 'INVALID_INVITE_CODE', message: 'No agency found for this invite code' }
        });
      }
      agencyId = ag.id;
    }

    // Duplicate check
    if (phone) {
      const [dup] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (dup) return reply.status(409).send({ success: false, error: { code: 'PHONE_TAKEN', message: 'Phone already registered' } });
    }
    if (email) {
      const [dup] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (dup) return reply.status(409).send({ success: false, error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } });
    }

    const password_hash = await bcrypt.hash(parsed.data.password, 12);
    const assignedRole = agencyId ? 'conductor' : 'passenger';
    const [user] = await db.insert(users).values({
      name: parsed.data.name,
      phone: phone ?? undefined,
      email: email ?? undefined,
      password_hash,
      role: assignedRole,
      agency_id: agencyId,
      is_active: true,
    }).returning();

    const tokens = await issueTokens(user);

    await db.insert(auditLogs).values({
      user_id: user.id,
      action: 'SIGNUP',
      entity_type: 'auth',
      entity_id: user.id,
      metadata: { role: assignedRole, contact: key, agency_id: agencyId },
      ip_address: request.ip,
    });

    return reply.status(201).send({
      success: true,
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: serializeUser(user),
      },
    });
  });

  // â”€â”€ POST /join-agency â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post('/join-agency', { preHandler: requireAuth() }, async (request, reply) => {
    const schema = z.object({
      agencyId:   z.string().uuid().optional(),
      inviteCode: z.string().min(4).optional(),
    }).refine((d) => d.agencyId || d.inviteCode, {
      message: 'Provide either agencyId or inviteCode',
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      });
    }

    const authUser = (request as any).user as { id: string };
    const { agencyId, inviteCode } = parsed.data;

    let resolvedAgencyId: string | undefined;

    if (agencyId) {
      const [ag] = await db.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1);
      if (!ag) {
        return reply.status(404).send({
          success: false,
          error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found' },
        });
      }
      resolvedAgencyId = ag.id;
    } else if (inviteCode) {
      const all = await db.select().from(agencies);
      const match = all.find(
        (ag) => ag.id.replace(/-/g, '').toUpperCase().startsWith(inviteCode.replace(/-/g, '').toUpperCase())
      );
      if (!match) {
        return reply.status(404).send({
          success: false,
          error: { code: 'INVALID_INVITE_CODE', message: 'No agency found for this invite code' },
        });
      }
      resolvedAgencyId = match.id;
    }

    if (!resolvedAgencyId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Could not resolve agency' },
      });
    }

    await db.update(users).set({ agency_id: resolvedAgencyId }).where(eq(users.id, authUser.id));

    await db.insert(auditLogs).values({
      user_id:     authUser.id,
      action:      'JOINED_AGENCY',
      entity_type: 'agency',
      entity_id:   resolvedAgencyId,
      metadata:    { inviteCode },
      ip_address:  request.ip,
    });

    return reply.send({
      success: true,
      data: { agencyId: resolvedAgencyId, message: 'Agency linked successfully' },
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/auth/invite/:token
  // Validate an invite token
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/invite/:token', async (req, reply) => {
    try {
      const { token } = req.params as { token: string };

      const [invite] = await db
        .select()
        .from(agencyInvites)
        .where(eq(agencyInvites.invite_token, token));

      if (!invite) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Invite not found' } });
      }

      if (invite.status !== 'pending' || new Date() > new Date(invite.expires_at)) {
        return reply.status(400).send({ success: false, error: { code: 'INVALID_INVITE', message: 'Invite is expired or already used' } });
      }

      return reply.send({ success: true, data: { phone: invite.phone, status: invite.status } });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // POST /api/auth/onboard
  // Accept invite, create agency, agency wallet, and owner user
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post('/onboard', async (req, reply) => {
    try {
      const body = req.body as any;
      const { token, agencyName, email, state, ownerName, password } = body;

      if (!token || !agencyName || !email || !state || !ownerName || !password) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'token, agencyName, email, state, ownerName, and password are required' },
        });
      }

      const [invite] = await db
        .select()
        .from(agencyInvites)
        .where(eq(agencyInvites.invite_token, token));

      if (!invite || invite.status !== 'pending' || new Date() > new Date(invite.expires_at)) {
        return reply.status(400).send({ success: false, error: { code: 'INVALID_INVITE', message: 'Invite is invalid, expired, or already used' } });
      }

      // Check if user already exists
      const [existingUser] = await db.select().from(users).where(eq(users.phone, invite.phone));
      if (existingUser) {
        return reply.status(400).send({ success: false, error: { code: 'USER_EXISTS', message: 'An account with this phone already exists' } });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 12);

      // Transaction to create agency, wallet, user, and update invite
      const result = await db.transaction(async (tx) => {
        // Create agency
        const [agency] = await tx
          .insert(agencies)
          .values({
            name: agencyName,
            phone: invite.phone,
            email: email.toLowerCase().trim(),
            state: state,
            onboarded_via_invite: true,
            invite_id: invite.id,
          })
          .returning();

        // Create agency wallet
        await tx
          .insert(agencyWallets)
          .values({
            agency_id: agency.id,
            trips_remaining: 0,
            trips_used_this_month: 0,
          });

        // Create owner user
        const [ownerUser] = await tx
          .insert(users)
          .values({
            name: ownerName,
            phone: invite.phone,
            email: email.toLowerCase().trim(),
            password_hash,
            role: 'owner',
            agency_id: agency.id,
            is_active: true,
          })
          .returning();

        // Update invite
        await tx
          .update(agencyInvites)
          .set({ status: 'accepted', accepted_at: new Date() })
          .where(eq(agencyInvites.id, invite.id));

        // Audit log
        await tx.insert(auditLogs).values({
          user_id: ownerUser.id,
          action: 'ONBOARDED_AGENCY',
          entity_type: 'agency',
          entity_id: agency.id,
          metadata: { agency_name: agencyName, owner_name: ownerName },
          ip_address: req.ip,
        });

        return { agency, ownerUser };
      });

      return reply.status(201).send({ 
        success: true, 
        data: { 
          message: 'Agency onboarded successfully',
          agencyId: result.agency.id,
          userId: result.ownerUser.id
        } 
      });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });
};

export default authRoutes;
