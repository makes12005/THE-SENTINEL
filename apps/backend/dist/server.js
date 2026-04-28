"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const cors_1 = __importDefault(require("@fastify/cors"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const google_routes_1 = __importDefault(require("./modules/auth/google.routes"));
const trips_routes_1 = __importDefault(require("./modules/trips/trips.routes"));
const routes_routes_1 = __importDefault(require("./modules/trips/routes.routes"));
const operator_routes_1 = __importDefault(require("./modules/operator/operator.routes"));
const owner_routes_1 = __importDefault(require("./modules/owner/owner.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const resources_routes_1 = __importDefault(require("./modules/operator/resources.routes"));
const socket_1 = require("./lib/socket");
const load_env_1 = require("./lib/load-env");
const db_1 = require("./db");
const redis_1 = require("./lib/redis");
const drizzle_orm_1 = require("drizzle-orm");
(0, load_env_1.loadEnv)();
const fastify = (0, fastify_1.default)({ logger: true });
const defaultCorsOrigins = [
    'https://bus-alert-iota.vercel.app',
    'http://localhost:3001',
    'http://localhost:3000',
];
const envCorsOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) || [];
const corsOrigins = Array.from(new Set([...defaultCorsOrigins, ...envCorsOrigins]));
// ─── Plugins ──────────────────────────────────────────────────────────────────
fastify.register(cors_1.default, {
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
fastify.register(multipart_1.default, {
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 1,
        fields: 10,
    },
});
// ─── Modules ──────────────────────────────────────────────────────────────────
fastify.register(auth_routes_1.default, { prefix: '/api/auth' });
fastify.register(google_routes_1.default, { prefix: '/api/auth' }); // /api/auth/google, /api/auth/google/callback
fastify.register(trips_routes_1.default, { prefix: '/api/trips' });
fastify.register(routes_routes_1.default, { prefix: '/api/routes' });
// Operator dashboard API (sprint 7)
// All routes live under /api: /api/operator/summary, /api/agency/members, /api/logs/alert-logs
fastify.register(operator_routes_1.default, { prefix: '/api' });
// Agency resources (sprint 10): /api/agency/buses, /api/agency/staff
fastify.register(resources_routes_1.default, { prefix: '/api' });
// Owner dashboard API (sprint 8)
// Routes: /api/owner/summary, /api/owner/operators, /api/owner/trips, /api/owner/logs, /api/agency/profile
fastify.register(owner_routes_1.default, { prefix: '/api' });
// Admin dashboard API (sprint 9)
// Routes: /api/admin/agencies, /api/admin/wallet/*, /api/admin/health, /api/admin/audit-logs
fastify.register(admin_routes_1.default, { prefix: '/api' });
// ─── Health check ─────────────────────────────────────────────────────────────
fastify.get('/health', async (request, reply) => {
    const start = performance.now();
    let dbStatus = 'connected';
    let redisStatus = 'connected';
    let overallStatus = 'ok';
    try {
        await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT 1`);
    }
    catch (err) {
        dbStatus = 'failed';
        overallStatus = 'degraded';
        fastify.log.error({ err }, 'DB Healthcheck failed');
    }
    try {
        const ping = await redis_1.redis.ping();
        if (ping !== 'PONG')
            throw new Error('Redis ping failed');
    }
    catch (err) {
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
        await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT 1`);
        fastify.log.info('Database connected');
        const redisPing = await redis_1.redis.ping();
        if (redisPing !== 'PONG')
            throw new Error('Redis ping failed');
        fastify.log.info('Redis connected');
        // Fastify already owns the underlying Node http.Server.
        await (0, socket_1.initSocketIO)(fastify.server);
        const port = parseInt(process.env.PORT || '3000', 10);
        await fastify.listen({ port, host: '0.0.0.0' });
        fastify.log.info(`Server running on port ${port}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
