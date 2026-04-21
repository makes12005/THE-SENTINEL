import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { and, eq, gt } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../db';
import { auditLogs, refreshTokens, users } from '../../db/schema';
import { PREFIX_BLACKLIST, redis } from '../../lib/redis';
import { requireAuth } from './auth.middleware';

const loginBodySchema = z.object({
  phone: z.string().min(3),
  password: z.string().min(1),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
}).optional();

const changePasswordBodySchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
});

type DbUser = typeof users.$inferSelect;
type TokenPayload = jwt.JwtPayload & {
  role?: string;
  agencyId?: string | null;
  agency_id?: string | null;
  name?: string;
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
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    agencyId: user.agency_id,
  };
}

async function issueTokens(user: DbUser) {
  const accessToken = jwt.sign(
    {
      id: user.id,
      role: user.role,
      agencyId: user.agency_id,
      name: user.name,
    },
    getJwtSecret(),
    { expiresIn: '15m', subject: user.id }
  );

  const refreshToken = jwt.sign(
    {
      role: user.role,
      agencyId: user.agency_id,
      type: 'refresh',
    },
    getRefreshSecret(),
    { expiresIn: '30d', subject: user.id }
  );

  await db.insert(refreshTokens).values({
    user_id: user.id,
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
    // Best-effort logout; ignore malformed or expired access tokens.
  }
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/login', async (request, reply) => {
    const parsed = loginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid login payload', details: parsed.error.format() },
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, parsed.data.phone))
      .limit(1);

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid phone or password' },
      });
    }

    if (!user.is_active) {
      return reply.status(403).send({
        success: false,
        error: { code: 'USER_DISABLED', message: 'Your account is currently disabled' },
      });
    }

    const passwordOk = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!passwordOk) {
      await db.insert(auditLogs).values({
        user_id: user.id,
        action: 'LOGIN_FAILED',
        entity_type: 'auth',
        entity_id: user.id,
        metadata: { reason: 'invalid_password' },
        ip_address: request.ip,
      });

      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid phone or password' },
      });
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.user_id, user.id));
    const tokens = await issueTokens(user);

    await db.insert(auditLogs).values({
      user_id: user.id,
      action: 'LOGIN_SUCCESS',
      entity_type: 'auth',
      entity_id: user.id,
      metadata: { role: user.role },
      ip_address: request.ip,
    });

    return {
      success: true,
      data: {
        access_token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        refreshToken: tokens.refreshToken,
        user: serializeUser(user),
      },
    };
  });

  fastify.post('/refresh', async (request, reply) => {
    const parsed = refreshBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid refresh payload', details: parsed.error.format() },
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
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token subject is missing' },
      });
    }

    const tokenHash = hashToken(parsed.data.refreshToken);
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.user_id, userId),
          eq(refreshTokens.token_hash, tokenHash),
          gt(refreshTokens.expires_at, new Date())
        )
      )
      .limit(1);

    if (!storedToken) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token has expired or was revoked' },
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || !user.is_active) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'User is not available for refresh' },
      });
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));
    const tokens = await issueTokens(user);

    return {
      success: true,
      data: {
        access_token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        refreshToken: tokens.refreshToken,
        user: serializeUser(user),
      },
    };
  });

  fastify.post('/logout', async (request, reply) => {
    const parsed = logoutBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid logout payload', details: parsed.error.format() },
      });
    }

    const authHeader = request.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    await revokeAccessToken(accessToken);

    if (parsed.data?.refreshToken) {
      await db.delete(refreshTokens).where(eq(refreshTokens.token_hash, hashToken(parsed.data.refreshToken)));
    }

    return reply.send({ success: true, data: { loggedOut: true } });
  });

  fastify.get('/me', { preHandler: requireAuth() }, async (request) => {
    return {
      success: true,
      data: (request as any).user,
    };
  });

  fastify.post('/change-password', { preHandler: requireAuth() }, async (request, reply) => {
    const parsed = changePasswordBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid password payload', details: parsed.error.format() },
      });
    }

    const authUser = (request as any).user as { id: string };
    const [user] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    const passwordOk = await bcrypt.compare(parsed.data.current_password, user.password_hash);
    if (!passwordOk) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' },
      });
    }

    const nextHash = await bcrypt.hash(parsed.data.new_password, 12);
    await db.update(users).set({ password_hash: nextHash }).where(eq(users.id, user.id));
    await db.delete(refreshTokens).where(eq(refreshTokens.user_id, user.id));

    await db.insert(auditLogs).values({
      user_id: user.id,
      action: 'PASSWORD_CHANGED',
      entity_type: 'auth',
      entity_id: user.id,
      metadata: { changed_at: new Date().toISOString() },
      ip_address: request.ip,
    });

    return {
      success: true,
      data: { changed: true },
    };
  });
};

export default authRoutes;
