import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { createServer } from 'http';
import tripsRoutes    from './modules/trips/trips.routes';
import routesRoutes   from './modules/trips/routes.routes';
import operatorRoutes from './modules/operator/operator.routes';
import ownerRoutes    from './modules/owner/owner.routes';
import adminRoutes    from './modules/admin/admin.routes';
import { initSocketIO } from './lib/socket';
import { db } from './db';
import { redis } from './lib/redis';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const fastify = Fastify({ logger: true });

// ─── Plugins ──────────────────────────────────────────────────────────────────
// Multipart support for CSV / xlsx uploads (limits: 10 MB file, 100 fields)
fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
    fields: 10,
  },
});

// ─── Modules ──────────────────────────────────────────────────────────────────
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

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await fastify.ready();

    // Attach Socket.IO to the raw http.Server
    const httpServer = createServer(fastify.server);
    initSocketIO(httpServer);

    const port = parseInt(process.env.PORT || '3000', 10);
    httpServer.listen(port, '0.0.0.0', () => {
      fastify.log.info(`Bus Alert backend + Socket.IO listening on port ${port}`);
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
