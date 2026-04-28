"use strict";
/**
 * Admin Module Routes — Sprint 9
 *
 * ALL endpoints require role=admin (platform owner).
 * No agency scope — admin sees ALL agencies.
 *
 * Agencies:
 *   GET  /api/admin/agencies             — list all agencies on platform
 *   POST /api/admin/agencies             — create agency + owner in one transaction
 *   POST /api/admin/agencies/:id/toggle  — activate/deactivate entire agency
 *
 * Wallet:
 *   GET  /api/admin/wallet/summary       — platform-wide trip usage + per-agency balances
 *   GET  /api/admin/wallet/:agencyId     — agency wallet detail + transactions
 *   POST /api/admin/wallet/:agencyId/topup      — add trip credits to agency
 *   PUT  /api/admin/wallet/:agencyId/config     — update low_trip_threshold
 *
 * System Health:
 *   GET  /api/admin/health               — platform metrics snapshot
 *   GET  /api/admin/audit-logs           — audit log tail (last 200 rows)
 *
 * Audit:
 *   Every mutating admin action is logged to the audit_logs table.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminRoutes;
const auth_middleware_1 = require("../auth/auth.middleware");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const shared_types_1 = require("../../lib/shared-types");
const wallet_service_1 = require("../wallet/wallet.service");
// ─── Helpers ──────────────────────────────────────────────────────────────────
function handleError(reply, err) {
    const status = err.statusCode ?? 500;
    return reply.status(status).send({
        success: false,
        error: { code: 'REQUEST_FAILED', message: err.message ?? 'An error occurred' },
    });
}
function todayStart() {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
function monthStart() {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
async function logAdminAction(adminId, action, entityType, entityId, metadata, ip) {
    await db_1.db.insert(schema_1.auditLogs).values({
        user_id: adminId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
        ip_address: ip,
    });
}
// ─── Route Plugin ─────────────────────────────────────────────────────────────
async function adminRoutes(fastify) {
    // ───────────────────────────────────────────────────────────────────────────
    // GET /api/admin/agencies
    // Returns ALL agencies on the platform with owner name, trip count, balance.
    // Admin only.
    // ───────────────────────────────────────────────────────────────────────────
    fastify.get('/admin/agencies', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const monthAgo = monthStart();
            const rows = await db_1.db
                .select({
                id: schema_1.agencies.id,
                name: schema_1.agencies.name,
                phone: schema_1.agencies.phone,
                email: schema_1.agencies.email,
                state: schema_1.agencies.state,
                created_at: schema_1.agencies.created_at,
            })
                .from(schema_1.agencies)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.agencies.created_at));
            // Enrich with owner user + trip count + wallet balance in parallel
            const enriched = await Promise.all(rows.map(async (agency) => {
                const [ownerRow] = await db_1.db
                    .select({ name: schema_1.users.name, phone: schema_1.users.phone, is_active: schema_1.users.is_active })
                    .from(schema_1.users)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.agency_id, agency.id), (0, drizzle_orm_1.eq)(schema_1.users.role, 'owner')))
                    .limit(1);
                const [tripRow] = await db_1.db
                    .select({ cnt: (0, drizzle_orm_1.count)() })
                    .from(schema_1.trips)
                    .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.trips.owned_by_operator_id, schema_1.users.id))
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.agency_id, agency.id), (0, drizzle_orm_1.gte)(schema_1.trips.created_at, monthAgo)));
                const wallet = await (0, wallet_service_1.getOrCreateWallet)(agency.id);
                return {
                    ...agency,
                    owner_name: ownerRow?.name ?? '—',
                    owner_phone: ownerRow?.phone ?? '—',
                    is_active: ownerRow?.is_active ?? true,
                    trips_this_month: Number(tripRow?.cnt ?? 0),
                    trips_remaining: wallet.trips_remaining,
                    low_trips: wallet.trips_remaining <= wallet.low_trip_threshold,
                };
            }));
            return reply.send({
                success: true,
                data: enriched,
                meta: { count: enriched.length, timestamp: new Date().toISOString() },
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // POST /api/admin/agencies
    // Creates an agency AND its owner user in a single DB transaction.
    // Body: { name, ownerName, ownerPhone, ownerEmail, ownerPassword, state }
    // ───────────────────────────────────────────────────────────────────────────
    fastify.post('/admin/agencies', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const admin = req.user;
            const body = req.body ?? {};
            const { name, ownerName, ownerPhone, ownerEmail, ownerPassword, state } = body;
            if (!name || !ownerName || !ownerPhone || !ownerPassword) {
                return reply.status(400).send({
                    success: false,
                    error: { code: 'MISSING_FIELDS', message: 'name, ownerName, ownerPhone, ownerPassword are required' },
                });
            }
            if (!/^\+91\d{10}$/.test(ownerPhone)) {
                return reply.status(400).send({
                    success: false,
                    error: { code: 'INVALID_PHONE', message: 'ownerPhone must be in E.164 format: +91XXXXXXXXXX' },
                });
            }
            // Collision check before transaction
            const [existingPhone] = await db_1.db.select({ id: schema_1.users.id }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.phone, ownerPhone)).limit(1);
            if (existingPhone) {
                return reply.status(409).send({ success: false, error: { code: 'PHONE_TAKEN', message: 'A user with this phone already exists' } });
            }
            const hash = await bcryptjs_1.default.hash(ownerPassword, 12);
            // Create agency + owner in a DB transaction
            const result = await db_1.db.transaction(async (tx) => {
                const [agency] = await tx
                    .insert(schema_1.agencies)
                    .values({
                    name: name.trim(),
                    phone: ownerPhone.trim(),
                    email: ownerEmail?.trim() ?? '',
                    state: state?.trim() ?? '',
                })
                    .returning();
                const [owner] = await tx
                    .insert(schema_1.users)
                    .values({
                    agency_id: agency.id,
                    name: ownerName.trim(),
                    phone: ownerPhone.trim(),
                    email: ownerEmail?.trim(),
                    password_hash: hash,
                    role: 'owner',
                    is_active: true,
                })
                    .returning({ id: schema_1.users.id, name: schema_1.users.name, phone: schema_1.users.phone, role: schema_1.users.role });
                // Create default wallet for new agency (0 trip credits)
                await tx.insert(schema_1.agencyWallets).values({
                    agency_id: agency.id,
                    trips_remaining: 0,
                    trips_used_this_month: 0,
                    low_trip_threshold: 10,
                });
                return { agency, owner };
            });
            await logAdminAction(admin.id, 'CREATE_AGENCY', 'agency', result.agency.id, { ownerName, ownerPhone }, req.ip);
            return reply.status(201).send({ success: true, data: result });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // POST /api/admin/agencies/:id/toggle
    // Activates or deactivates ALL users in the agency (blocks logins).
    // ───────────────────────────────────────────────────────────────────────────
    fastify.post('/admin/agencies/:id/toggle', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const admin = req.user;
            const params = req.params;
            const agencyId = params.id;
            // Get current active status from owner
            const [owner] = await db_1.db
                .select({ id: schema_1.users.id, is_active: schema_1.users.is_active })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.users.role, 'owner')))
                .limit(1);
            if (!owner) {
                return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Agency or owner not found' } });
            }
            const newStatus = !owner.is_active;
            // Toggle ALL users in agency
            await db_1.db
                .update(schema_1.users)
                .set({ is_active: newStatus })
                .where((0, drizzle_orm_1.eq)(schema_1.users.agency_id, agencyId));
            await logAdminAction(admin.id, newStatus ? 'ACTIVATE_AGENCY' : 'DEACTIVATE_AGENCY', 'agency', agencyId, {}, req.ip);
            return reply.send({ success: true, data: { agency_id: agencyId, is_active: newStatus } });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // GET /api/admin/wallet/summary
    // Platform-wide: total trips used, total credits topped-up, per-agency balances.
    // ───────────────────────────────────────────────────────────────────────────
    fastify.get('/admin/wallet/summary', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            // Total trips consumed across all agencies
            const [deductionRow] = await db_1.db
                .select({ total: (0, drizzle_orm_1.sum)(schema_1.walletTransactions.trips_amount) })
                .from(schema_1.walletTransactions)
                .where((0, drizzle_orm_1.eq)(schema_1.walletTransactions.type, 'trip_deduction'));
            // Total trips credited (top-ups)
            const [topupRow] = await db_1.db
                .select({ total: (0, drizzle_orm_1.sum)(schema_1.walletTransactions.trips_amount) })
                .from(schema_1.walletTransactions)
                .where((0, drizzle_orm_1.eq)(schema_1.walletTransactions.type, 'trip_topup'));
            // Per-agency wallet overview
            const wallets = await db_1.db
                .select({
                agency_id: schema_1.agencyWallets.agency_id,
                trips_remaining: schema_1.agencyWallets.trips_remaining,
                trips_used_this_month: schema_1.agencyWallets.trips_used_this_month,
                low_trip_threshold: schema_1.agencyWallets.low_trip_threshold,
                updated_at: schema_1.agencyWallets.updated_at,
            })
                .from(schema_1.agencyWallets)
                .orderBy(schema_1.agencyWallets.trips_remaining);
            // Attach agency names
            const agencyIds = wallets.map((w) => w.agency_id);
            const agencyRows = agencyIds.length > 0
                ? await db_1.db.select({ id: schema_1.agencies.id, name: schema_1.agencies.name }).from(schema_1.agencies).where((0, drizzle_orm_1.inArray)(schema_1.agencies.id, agencyIds))
                : [];
            const agencyMap = Object.fromEntries(agencyRows.map((a) => [a.id, a.name]));
            const agencyWalletList = wallets.map((w) => ({
                agency_id: w.agency_id,
                agency_name: agencyMap[w.agency_id] ?? '—',
                trips_remaining: w.trips_remaining,
                trips_used_this_month: w.trips_used_this_month,
                low_trips: w.trips_remaining <= w.low_trip_threshold,
            }));
            const totalConsumed = Math.abs(Number(deductionRow?.total ?? 0));
            const totalTopups = Number(topupRow?.total ?? 0);
            return reply.send({
                success: true,
                data: {
                    total_trips_consumed: totalConsumed,
                    total_trips_credited: totalTopups,
                    agency_count: agencyWalletList.length,
                    low_trips_agencies: agencyWalletList.filter((a) => a.low_trips).length,
                    agency_wallets: agencyWalletList,
                },
                meta: { timestamp: new Date().toISOString() },
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // GET /api/admin/wallet/:agencyId
    // Per-agency: wallet state + recent transactions (last 100)
    // ───────────────────────────────────────────────────────────────────────────
    fastify.get('/admin/wallet/:agencyId', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const params = req.params;
            const agencyId = params.agencyId;
            const [agency] = await db_1.db.select().from(schema_1.agencies).where((0, drizzle_orm_1.eq)(schema_1.agencies.id, agencyId)).limit(1);
            if (!agency)
                return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Agency not found' } });
            const wallet = await (0, wallet_service_1.getOrCreateWallet)(agencyId);
            const transactions = await db_1.db
                .select()
                .from(schema_1.walletTransactions)
                .where((0, drizzle_orm_1.eq)(schema_1.walletTransactions.agency_id, agencyId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.walletTransactions.created_at))
                .limit(100);
            return reply.send({
                success: true,
                data: {
                    agency: { id: agency.id, name: agency.name },
                    wallet: {
                        trips_remaining: wallet.trips_remaining,
                        trips_used_this_month: wallet.trips_used_this_month,
                        low_trip_threshold: wallet.low_trip_threshold,
                        low_trips: wallet.trips_remaining <= wallet.low_trip_threshold,
                    },
                    transactions,
                },
                meta: { timestamp: new Date().toISOString() },
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // POST /api/admin/wallet/:agencyId/topup
    // Body: { trips, description?, reference_id? }
    // ───────────────────────────────────────────────────────────────────────────
    fastify.post('/admin/wallet/:agencyId/topup', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const admin = req.user;
            const params = req.params;
            const body = req.body ?? {};
            const agencyId = params.agencyId;
            const tripsToAdd = Math.floor(Number(body.trips ?? 0));
            if (!tripsToAdd || tripsToAdd <= 0) {
                return reply.status(400).send({ success: false, error: { code: 'INVALID_AMOUNT', message: '`trips` must be a positive integer' } });
            }
            const [agency] = await db_1.db.select({ name: schema_1.agencies.name }).from(schema_1.agencies).where((0, drizzle_orm_1.eq)(schema_1.agencies.id, agencyId)).limit(1);
            if (!agency)
                return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Agency not found' } });
            const { tripsRemainingAfter } = await (0, wallet_service_1.topUpTrips)(agencyId, tripsToAdd, body.description ?? `Admin top-up of ${tripsToAdd} trip(s)`, body.reference_id);
            await logAdminAction(admin.id, 'TOPUP_AGENCY_WALLET', 'wallet', agencyId, { tripsToAdd }, req.ip);
            return reply.send({
                success: true,
                data: {
                    agency_id: agencyId,
                    trips_added: tripsToAdd,
                    trips_remaining: tripsRemainingAfter,
                },
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // PUT /api/admin/wallet/:agencyId/config
    // Body: { low_trip_threshold? }
    // ───────────────────────────────────────────────────────────────────────────
    fastify.put('/admin/wallet/:agencyId/config', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const admin = req.user;
            const params = req.params;
            const body = req.body ?? {};
            const agencyId = params.agencyId;
            const updates = {};
            if (body.low_trip_threshold !== undefined)
                updates.low_trip_threshold = Math.floor(Number(body.low_trip_threshold));
            if (Object.keys(updates).length === 0) {
                return reply.status(400).send({ success: false, error: { code: 'NO_FIELDS', message: 'Provide low_trip_threshold' } });
            }
            const updated = await (0, wallet_service_1.updateWalletConfig)(agencyId, updates);
            await logAdminAction(admin.id, 'UPDATE_WALLET_CONFIG', 'wallet', agencyId, body, req.ip);
            return reply.send({
                success: true,
                data: {
                    agency_id: agencyId,
                    low_trip_threshold: updated.low_trip_threshold,
                },
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // GET /api/admin/health
    // Platform-wide snapshot: agencies, users, active trips, alerts today.
    // ───────────────────────────────────────────────────────────────────────────
    fastify.get('/admin/health', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const dayStart = todayStart();
            const [[agencyRow], [userRow], [tripRow], [alertRow], [activeRow]] = await Promise.all([
                db_1.db.select({ cnt: (0, drizzle_orm_1.count)() }).from(schema_1.agencies),
                db_1.db.select({ cnt: (0, drizzle_orm_1.count)() }).from(schema_1.users),
                db_1.db.select({ cnt: (0, drizzle_orm_1.count)() }).from(schema_1.trips),
                db_1.db.select({ cnt: (0, drizzle_orm_1.count)() }).from(schema_1.tripPassengers).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tripPassengers.alert_status, 'sent'), (0, drizzle_orm_1.gte)(schema_1.tripPassengers.alert_sent_at, dayStart))),
                db_1.db.select({ cnt: (0, drizzle_orm_1.count)() }).from(schema_1.trips).where((0, drizzle_orm_1.eq)(schema_1.trips.status, 'active')),
            ]);
            // DB connectivity check via raw query
            let dbStatus = 'ok';
            try {
                await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT 1`);
            }
            catch {
                dbStatus = 'error';
            }
            return reply.send({
                success: true,
                data: {
                    db_status: dbStatus,
                    total_agencies: Number(agencyRow?.cnt ?? 0),
                    total_users: Number(userRow?.cnt ?? 0),
                    total_trips: Number(tripRow?.cnt ?? 0),
                    active_trips: Number(activeRow?.cnt ?? 0),
                    alerts_sent_today: Number(alertRow?.cnt ?? 0),
                    uptime_seconds: Math.floor(process.uptime()),
                    memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    node_version: process.version,
                },
                meta: { timestamp: new Date().toISOString() },
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // GET /api/admin/audit-logs
    // Last 200 admin audit log entries. Query: ?entity_type=agency&action=CREATE
    // ───────────────────────────────────────────────────────────────────────────
    fastify.get('/admin/audit-logs', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const query = req.query ?? {};
            const conditions = [];
            if (query.entity_type)
                conditions.push((0, drizzle_orm_1.eq)(schema_1.auditLogs.entity_type, query.entity_type));
            if (query.action)
                conditions.push((0, drizzle_orm_1.eq)(schema_1.auditLogs.action, query.action));
            const logs = await db_1.db
                .select({
                id: schema_1.auditLogs.id,
                action: schema_1.auditLogs.action,
                entity_type: schema_1.auditLogs.entity_type,
                entity_id: schema_1.auditLogs.entity_id,
                metadata: schema_1.auditLogs.metadata,
                ip_address: schema_1.auditLogs.ip_address,
                created_at: schema_1.auditLogs.created_at,
                user_id: schema_1.auditLogs.user_id,
            })
                .from(schema_1.auditLogs)
                .where(conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.auditLogs.created_at))
                .limit(200);
            // Enrich with user name
            const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))];
            const userRows = userIds.length > 0
                ? await db_1.db.select({ id: schema_1.users.id, name: schema_1.users.name }).from(schema_1.users).where((0, drizzle_orm_1.inArray)(schema_1.users.id, userIds))
                : [];
            const userMap = Object.fromEntries(userRows.map((u) => [u.id, u.name]));
            return reply.send({
                success: true,
                data: logs.map((l) => ({ ...l, actor_name: userMap[l.user_id ?? ''] ?? 'System' })),
                meta: { count: logs.length, timestamp: new Date().toISOString() },
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    // ───────────────────────────────────────────────────────────────────────────
    // GET /api/admin/invites
    // List all agency invites
    // ───────────────────────────────────────────────────────────────────────────
    // List all pending invites
    fastify.get('/admin/agencies/invites', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const rows = await db_1.db
                .select({
                id: schema_1.agencyInvites.id,
                phone: schema_1.agencyInvites.phone,
                invite_token: schema_1.agencyInvites.invite_token,
                status: schema_1.agencyInvites.status,
                expires_at: schema_1.agencyInvites.expires_at,
                created_at: schema_1.agencyInvites.created_at,
                accepted_at: schema_1.agencyInvites.accepted_at,
            })
                .from(schema_1.agencyInvites)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.agencyInvites.created_at));
            return reply.send({
                success: true,
                data: rows,
                meta: { count: rows.length, timestamp: new Date().toISOString() },
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    // POST /api/admin/agencies/invite
    // Create a new agency invite
    fastify.post('/admin/agencies/invite', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const admin = req.user;
            const body = req.body ?? {};
            const { phone } = body;
            if (!phone) {
                return reply.status(400).send({
                    success: false,
                    error: { code: 'MISSING_FIELDS', message: 'phone is required' },
                });
            }
            if (!/^(\+91\d{10}|\d{10})$/.test(phone)) {
                return reply.status(400).send({
                    success: false,
                    error: { code: 'INVALID_PHONE', message: 'phone must be 10 digits or +91XXXXXXXXXX' },
                });
            }
            let normalizedPhone = phone;
            if (phone.length === 10) {
                normalizedPhone = `+91${phone}`;
            }
            else if (!phone.startsWith('+')) {
                normalizedPhone = `+${phone}`;
            }
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days validity
            const [invite] = await db_1.db
                .insert(schema_1.agencyInvites)
                .values({
                phone: normalizedPhone,
                invited_by: admin.id,
                expires_at: expiresAt,
            })
                .returning();
            await logAdminAction(admin.id, 'CREATE_INVITE', 'agency_invite', invite.id, { phone: normalizedPhone }, req.ip);
            // In a real app, send SMS/WhatsApp here. For now, we return the link.
            const inviteLink = `${process.env.FRONTEND_URL}/onboard?token=${invite.invite_token}`;
            return reply.status(201).send({
                success: true,
                data: {
                    ...invite,
                    invite_link: inviteLink
                }
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    // POST /api/admin/agencies/invite/:id/resend
    fastify.post('/admin/agencies/invite/:id/resend', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const admin = req.user;
            const { id } = req.params;
            const [invite] = await db_1.db
                .select()
                .from(schema_1.agencyInvites)
                .where((0, drizzle_orm_1.eq)(schema_1.agencyInvites.id, id))
                .limit(1);
            if (!invite) {
                return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Invite not found' } });
            }
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            const [updated] = await db_1.db
                .update(schema_1.agencyInvites)
                .set({
                status: 'pending',
                expires_at: expiresAt,
                created_at: new Date() // Refresh created_at for sorting
            })
                .where((0, drizzle_orm_1.eq)(schema_1.agencyInvites.id, id))
                .returning();
            await logAdminAction(admin.id, 'RESEND_INVITE', 'agency_invite', id, { phone: invite.phone }, req.ip);
            const inviteLink = `${process.env.FRONTEND_URL}/onboard?token=${updated.invite_token}`;
            return reply.send({
                success: true,
                data: {
                    ...updated,
                    invite_link: inviteLink
                }
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
}
