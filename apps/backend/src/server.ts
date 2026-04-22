import Fastify from 'fastify';
import multipart from '@fastify/multipart';
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
import { sql, eq, or } from 'drizzle-orm';
import { users } from './db/schema';
import bcrypt from 'bcryptjs';

loadEnv();

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

// ─── Temporary Admin Seeding (Sprint 1 Bootstrapping) ─────────────────────────
fastify.get('/api/temp-seed-admin', async (request, reply) => {
  const { secret } = request.query as { secret?: string };
  if (secret !== 'mahek-admin-secure-2024') {
    return reply.code(403).send({ success: false, error: 'Forbidden' });
  }

  try {
    const adminEmail = 'mahekzalavadiya123@gmail.com';
    const adminPhone = '+917778069828';
    const adminPassword = 'Maahek$1210';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const existingUser = await db.select()
      .from(users)
      .where(or(eq(users.email, adminEmail), eq(users.phone, adminPhone)))
      .limit(1);

    if (existingUser.length > 0) {
      await db.update(users)
        .set({
          role: 'admin',
          password_hash: hashedPassword,
          name: 'mahek',
          is_active: true
        })
        .where(eq(users.id, existingUser[0].id));
      
      return { success: true, message: 'Admin user updated', id: existingUser[0].id };
    } else {
      const [newAdmin] = await db.insert(users)
        .values({
          name: 'mahek',
          email: adminEmail,
          phone: adminPhone,
          password_hash: hashedPassword,
          role: 'admin',
          is_active: true,
        })
        .returning({ id: users.id });
      
      return { success: true, message: 'Admin user created', id: newAdmin.id };
    }
  } catch (err: any) {
    fastify.log.error(err);
    return reply.code(500).send({ success: false, error: err.message });
  }
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
