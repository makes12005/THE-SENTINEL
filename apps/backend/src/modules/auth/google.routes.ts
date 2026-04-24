/**
 * Google OAuth 2.0 routes
 * GET  /api/auth/google           → redirect user to Google consent screen
 * GET  /api/auth/google/callback  → exchange code → find/create user → redirect to web app with JWT
 *
 * Required env vars (never hardcode):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_CALLBACK_URL   e.g. https://api.yourdomain.com/api/auth/google/callback
 *   WEB_APP_URL           e.g. https://yourdomain.com
 *   JWT_SECRET
 *   REFRESH_TOKEN_SECRET
 */

import { createHash, randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import { db } from '../../db';
import { auditLogs, refreshTokens, users } from '../../db/schema';

// ─── Helpers (mirrors auth.routes.ts, kept local to avoid circular deps) ────

type DbUser = typeof users.$inferSelect;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

function getOAuth2Client(): OAuth2Client {
  return new OAuth2Client(
    getEnv('GOOGLE_CLIENT_ID'),
    getEnv('GOOGLE_CLIENT_SECRET'),
    getEnv('GOOGLE_CALLBACK_URL'),
  );
}

async function issueTokens(user: DbUser) {
  const jwtSecret = getEnv('JWT_SECRET');
  const refreshSecret = getEnv('REFRESH_TOKEN_SECRET');

  const accessToken = jwt.sign(
    { id: user.id, role: user.role, agencyId: user.agency_id, name: user.name },
    jwtSecret,
    { expiresIn: '15m', subject: user.id },
  );

  const refreshToken = jwt.sign(
    { role: user.role, agencyId: user.agency_id, type: 'refresh' },
    refreshSecret,
    { expiresIn: '30d', subject: user.id },
  );

  await db.insert(refreshTokens).values({
    user_id: user.id,
    token_hash: hashToken(refreshToken),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  return { accessToken, refreshToken };
}

// ─── In-memory CSRF state store (good enough for stateless API servers) ──────
// A real production system should use Redis with a short TTL.
const oauthStateStore = new Map<string, number>();

function generateState(): string {
  const state = randomBytes(24).toString('hex');
  // Store with 10-minute expiry timestamp
  oauthStateStore.set(state, Date.now() + 10 * 60 * 1000);
  // Prune expired states
  const now = Date.now();
  for (const [k, exp] of oauthStateStore.entries()) {
    if (exp < now) oauthStateStore.delete(k);
  }
  return state;
}

function validateState(state: string): boolean {
  const expiry = oauthStateStore.get(state);
  if (!expiry || expiry < Date.now()) return false;
  oauthStateStore.delete(state); // one-time use
  return true;
}

// ─── Route plugin ─────────────────────────────────────────────────────────────

const googleAuthRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Step 1: Redirect user to Google consent screen
   */
  fastify.get('/google', async (request, reply) => {
    const client = getOAuth2Client();
    const state = generateState();

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
    });

    return reply.redirect(authUrl);
  });

  /**
   * Step 2: Google redirects here with ?code=...&state=...
   */
  fastify.get<{
    Querystring: { code?: string; state?: string; error?: string };
  }>('/google/callback', async (request, reply) => {
    const webAppUrl = getEnv('WEB_APP_URL');
    const errorRedirect = (msg: string) =>
      reply.redirect(`${webAppUrl}/login?error=${encodeURIComponent(msg)}`);

    // ── Error from Google
    if (request.query.error) {
      return errorRedirect(request.query.error);
    }

    // ── CSRF state check
    const { code, state } = request.query;
    if (!state || !validateState(state)) {
      return errorRedirect('invalid_state');
    }

    if (!code) {
      return errorRedirect('missing_code');
    }

    // ── Exchange code for tokens
    const client = getOAuth2Client();
    let googlePayload: {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    try {
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      // Verify the ID token to get user info safely
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: getEnv('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub) {
        return errorRedirect('google_token_invalid');
      }

      googlePayload = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
    } catch (err: any) {
      fastify.log.error({ err }, 'Google OAuth token exchange failed');
      return errorRedirect('token_exchange_failed');
    }

    const { sub: googleId, email, name } = googlePayload;

    if (!email) {
      return errorRedirect('no_email_from_google');
    }

    // ── Find existing user by email
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user && !user.is_active) {
      return errorRedirect('account_disabled');
    }

    // ── Auto-provision a new passenger-role user if not found
    if (!user) {
      // Use a random unguessable password hash since they'll only ever use Google
      const dummyHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

      // Phone is required (NOT NULL). For Google OAuth users we store a placeholder.
      // The user must complete their profile after first login.
      const placeholderPhone = `+91google${googleId.slice(-8)}`; // unique & E.164-like

      const [created] = await db
        .insert(users)
        .values({
          name: name ?? 'Google User',
          phone: placeholderPhone,
          email,
          password_hash: dummyHash,
          role: 'passenger', // default; admin can promote later
          is_active: true,
        })
        .returning();

      user = created;

      await db.insert(auditLogs).values({
        user_id: user.id,
        action: 'GOOGLE_SIGNUP',
        entity_type: 'auth',
        entity_id: user.id,
        metadata: { googleId, email, provider: 'google' },
        ip_address: request.ip,
      });
    } else {
      await db.insert(auditLogs).values({
        user_id: user.id,
        action: 'GOOGLE_LOGIN',
        entity_type: 'auth',
        entity_id: user.id,
        metadata: { googleId, email, provider: 'google' },
        ip_address: request.ip,
      });
    }

    // ── Issue JWT pair
    const { accessToken, refreshToken } = await issueTokens(user);

    // ── Redirect to frontend /auth/callback with tokens in query params
    // The frontend page reads these, stores them in Zustand, then navigates to dashboard.
    const userJson = encodeURIComponent(
      JSON.stringify({
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        agencyId: user.agency_id,
      }),
    );

    const redirectUrl =
      `${webAppUrl}/auth/callback` +
      `?access_token=${encodeURIComponent(accessToken)}` +
      `&refresh_token=${encodeURIComponent(refreshToken)}` +
      `&user=${userJson}`;

    return reply.redirect(redirectUrl);
  });
};

export default googleAuthRoutes;
