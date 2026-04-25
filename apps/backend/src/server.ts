import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import authRoutes       from './modules/auth/auth.routes';
import googleAuthRoutes from './modules/auth/google.routes';
import tripsRoutes    from './modules/trips/trips.routes';
import routesRoutes   from './modules/trips/routes.routes';
import operatorRoutes from './modules/operator/operator.routes';
import ownerRoutes    from './modules/owner/owner.routes';
import adminRoutes    from './modules/admin/admin.routes';
import { initSocketIO } from './lib/socket';
import { loadEnv } from './lib/load-env';
import { db } from './db';
import { redis } from './lib/redis';
import { sql } from 'drizzle-orm';

loadEnv();

const fastify = Fastify({ logger: true });
const defaultCorsOrigins = [
  'https://bus-alert-iota.vercel.app',
  'http://localhost:3001',
  'http://localhost:3000',
];
const envCorsOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) || [];
const corsOrigins = Array.from(new Set([...defaultCorsOrigins, ...envCorsOrigins]));

// ─── Plugins ──────────────────────────────────────────────────────────────────
fastify.register(cors, {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflight: true,
  preflightContinue: false,
});

// Multipart support for CSV / xlsx uploads (limits: 10 MB file, 100 fields)
fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
    fields: 10,
  },
});

// ─── Modules ──────────────────────────────────────────────────────────────────
fastify.register(authRoutes,       { prefix: '/api/auth' });
fastify.register(googleAuthRoutes, { prefix: '/api/auth' }); // /api/auth/google, /api/auth/google/callback
fastify.register(tripsRoutes,    { prefix: '/api/trips' });
fastify.register(routesRoutes,   { prefix: '/api/routes' });
// Operator dashboard API (sprint 7)
// All routes live under /api: /api/operator/summary, /api/agency/members, /api/logs/alert-logs
fastify.register(operatorRoutes, { prefix: '/api' });
// Owner dashboard API (sprint 8)
// Routes: /api/owner/summary, /api/owner/operators, /api/owner/trips, /api/owner/logs, /api/agency/profile
fastify.register(ownerRoutes, { prefix: '/api' });
// Admin dashboard API (sprint 9)
// Routes: /api/admin/agencies, /api/admin/billing/*, /api/admin/health, /api/admin/audit-logs
fastify.register(adminRoutes, { prefix: '/api' });

// ─── Health check ─────────────────────────────────────────────────────────────
fastify.get('/health', async (request, reply) => {
  const start = performance.now();
  
  let dbStatus = 'connected';
  let redisStatus = 'connected';
  let overallStatus = 'ok';

  try {
    await db.execute(sql`SELECT 1`);
  } catch (err) {
    dbStatus = 'failed';
    overallStatus = 'degraded';
    fastify.log.error({ err }, 'DB Healthcheck failed');
  }

  try {
    const ping = await redis.ping();
    if (ping !== 'PONG') throw new Error('Redis ping failed');
  } catch (err) {
    redisStatus = 'failed';
    overallStatus = 'degraded';
    fastify.log.error({ err }, 'Redis Healthcheck failed');
  }

  const durationMs = performance.now() - start;

  const responsePayload = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    db: dbStatus,
    redis: redisStatus,
    duration_ms: Math.round(durationMs),
  };

  return reply.code(overallStatus === 'ok' ? 200 : 503).send(responsePayload);
});

// Deprecated old healthcheck for internal compat if any, but mapping it to same.
fastify.get('/api/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  };
});

// Temporary debug endpoint to inspect registered Fastify routes in production.
fastify.get('/api/debug/routes', async () => {
  return {
    success: true,
    data: fastify.printRoutes(),
  };
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await fastify.ready();
    await db.execute(sql`SELECT 1`);
    fastify.log.info('Database connected');

    const redisPing = await redis.ping();
    if (redisPing !== 'PONG') throw new Error('Redis ping failed');
    fastify.log.info('Redis connected');

    // Fastify already owns the underlying Node http.Server.
    await initSocketIO(fastify.server);

    const port = parseInt(process.env.PORT || '3000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
