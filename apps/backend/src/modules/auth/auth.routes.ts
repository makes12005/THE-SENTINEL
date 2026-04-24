import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { and, eq, gt, or } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../db';
import { auditLogs, refreshTokens, users, agencies } from '../../db/schema';
import { PREFIX_BLACKLIST, redis } from '../../lib/redis';
import { requireAuth } from './auth.middleware';
import { OTPService } from './otp.service';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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
  // already well-formed or foreign number — prepend + if missing
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
    agencyId: user.agency_id ?? null,
    redirect: ROLE_REDIRECTS[user.role] ?? '/operator/dashboard',
  };
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

// ─────────────────────────────────────────────────────────────────────────────
// Route plugin
// ─────────────────────────────────────────────────────────────────────────────
const authRoutes: FastifyPluginAsync = async (fastify) => {

  // ── POST /login ─────────────────────────────────────────────────────────────
  fastify.post('/login', async (request, reply) => {
    const schema = z.object({
      identifier: z.string().min(3),   // phone or email
      password:   z.string().min(1),
      // legacy field names — kept for backwards compat
      phone:      z.string().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Phone/email and password are required' },
      });
    }

    // Accept "identifier" OR legacy "phone" field
    const raw = parsed.data.identifier || parsed.data.phone || '';
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

  // ── POST /refresh ────────────────────────────────────────────────────────────
  fastify.post('/refresh', async (request, reply) => {
    const schema = z.object({ refreshToken: z.string().min(1) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'refreshToken is required' },
      });
    }

    let payload: TokenPayload;
    try {
      payload = jwt.verify(parsed.data.refreshToken, getRefreshSecret()) as TokenPayload;
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

    const tokenHash = hashToken(parsed.data.refreshToken);
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

  // ── POST /logout ─────────────────────────────────────────────────────────────
  fastify.post('/logout', async (request, reply) => {
    const schema = z.object({ refreshToken: z.string().min(1).optional() }).optional();
    const parsed = schema.safeParse(request.body);

    const authHeader = request.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    await revokeAccessToken(accessToken);

    if (parsed.success && parsed.data?.refreshToken) {
      await db.delete(refreshTokens).where(eq(refreshTokens.token_hash, hashToken(parsed.data.refreshToken)));
    }

    return reply.send({ success: true, data: { loggedOut: true } });
  });

  // ── GET /me ──────────────────────────────────────────────────────────────────
  fastify.get('/me', { preHandler: requireAuth() }, async (request) => {
    return { success: true, data: (request as any).user };
  });

  // ── POST /change-password ─────────────────────────────────────────────────────
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

  // ── POST /register ────────────────────────────────────────────────────────────
  // Accepts: { name, identifier (phone or email), password }
  // The `identifier` field is auto-detected as phone or email.
  fastify.post('/register', async (request, reply) => {
    const schema = z.object({
      name:       z.string().min(2).max(255),
      identifier: z.string().min(3),   // phone or email
      password:   z.string().min(8),
      // legacy fields — kept for backwards compat
      phone:      z.string().optional(),
      email:      z.string().email().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code:    'VALIDATION_ERROR',
          message: 'name, identifier (phone or email), and password (min 8 chars) required',
          details: parsed.error.format(),
        },
      });
    }

    const { name, password } = parsed.data;
    const raw = parsed.data.identifier || parsed.data.phone || parsed.data.email || '';
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

    await db.insert(auditLogs).values({
      user_id:     user.id,
      action:      'REGISTER',
      entity_type: 'auth',
      entity_id:   user.id,
      metadata:    { role: 'passenger', identifier_type: identIsEmail ? 'email' : 'phone' },
      ip_address:  request.ip,
    });

    return reply.status(201).send({
      success: true,
      data: {
        message:         'Account created. Please verify your identity.',
        identifier_type: identIsEmail ? 'email' : 'phone',
      },
    });
  });

  // ── POST /send-otp ────────────────────────────────────────────────────────────
  // Accepts: { identifier } — phone or email.
  fastify.post('/send-otp', async (request, reply) => {
    const schema = z.object({
      identifier: z.string().min(3),
      phone: z.string().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'identifier required' },
      });
    }

    const raw = parsed.data.identifier || parsed.data.phone || '';
    const key = isEmail(raw) ? raw.toLowerCase().trim() : normalisePhone(raw);
    
    // Rate limit check
    const rlKey = `rl:otp:${key}`;
    const attemptsStr = await redis.get(rlKey);
    const attempts = parseInt(attemptsStr || '0', 10);
    if (attempts >= 5) {
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
        message: isEmail(raw)
          ? 'OTP sent to your email'
          : 'OTP sent to your phone',
        identifier_type: isEmail(raw) ? 'email' : 'phone',
        ...(isDev && { otp }), // Only leak OTP in dev
      },
    });
  });

  // ── POST /verify-otp ──────────────────────────────────────────────────────────
  fastify.post('/verify-otp', async (request, reply) => {
    const schema = z.object({
      identifier: z.string().min(3),
      otp:        z.string().length(6),
      phone:      z.string().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'identifier and 6-digit OTP required' },
      });
    }

    const raw = parsed.data.identifier || parsed.data.phone || '';
    const key = isEmail(raw) ? raw.toLowerCase().trim() : normalisePhone(raw);

    const isValid = await OTPService.verifyOTP(key, parsed.data.otp);
    if (!isValid) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP.' },
      });
    }

    const user = await findUserByIdentifier(key);
    
    // If user exists, log them in directly
    if (user) {
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
        metadata:    { identifier: key },
        ip_address:  request.ip,
      });

      return reply.send({
        success: true,
        data: {
          is_new_user: false,
          access_token:  tokens.accessToken,
          accessToken:   tokens.accessToken,
          refresh_token: tokens.refreshToken,
          refreshToken:  tokens.refreshToken,
          user:          serializeUser(user),
        },
      });
    }

    // If user doesn't exist, issue a temporary token for signup
    const tempToken = jwt.sign(
      { identifier: key, type: 'signup_temp' },
      getJwtSecret(),
      { expiresIn: '15m' }
    );

    return reply.send({
      success: true,
      data: {
        is_new_user: true,
        temp_token: tempToken,
        message: 'Proceed to signup'
      },
    });
  });

  // ── POST /signup ──────────────────────────────────────────────────────────────
  fastify.post('/signup', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2).max(255),
      password: z.string().min(8),
      temp_token: z.string().min(1),
      agency_invite_code: z.string().optional()
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
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

    const key = payload.identifier;
    const identIsEmail = isEmail(key);
    const phone = identIsEmail ? null : key;
    const email = identIsEmail ? key : null;

    // Check agency invite code if provided
    let agencyId: string | undefined;
    if (parsed.data.agency_invite_code) {
      const [ag] = await db.select().from(agencies).where(eq(agencies.invite_code, parsed.data.agency_invite_code)).limit(1);
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
    const [user] = await db.insert(users).values({
      name: parsed.data.name,
      phone: phone ?? undefined,
      email: email ?? undefined,
      password_hash,
      role: 'passenger', // Base role, if agency is linked it could be upgraded manually later or based on code type
      agency_id: agencyId,
      is_active: true,
    }).returning();

    const tokens = await issueTokens(user);

    await db.insert(auditLogs).values({
      user_id: user.id,
      action: 'SIGNUP',
      entity_type: 'auth',
      entity_id: user.id,
      metadata: { role: 'passenger', identifier: key, agency_id: agencyId },
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

  // ── POST /join-agency ─────────────────────────────────────────────────────────
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
};

export default authRoutes;
