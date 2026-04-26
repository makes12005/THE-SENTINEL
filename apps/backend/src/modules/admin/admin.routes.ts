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

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../auth/auth.middleware';
import { db } from '../../db';
import {
  agencies, users, trips, tripPassengers, alertLogs,
  agencyWallets, walletTransactions, auditLogs, agencyInvites,
} from '../../db/schema';
import {
  eq, and, sql, count, desc, sum, gte, inArray,
} from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { UserRole } from '../../lib/shared-types';
import {
  topUpTrips,
  updateWalletConfig,
  getOrCreateWallet,
} from '../wallet/wallet.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function handleError(reply: FastifyReply, err: any) {
  const status = err.statusCode ?? 500;
  return reply.status(status).send({
    success: false,
    error: { code: 'REQUEST_FAILED', message: err.message ?? 'An error occurred' },
  });
}

function todayStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function monthStart(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function logAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: any,
  ip?: string
) {
  await db.insert(auditLogs).values({
    user_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
    ip_address: ip,
  });
}

// ─── Route Plugin ─────────────────────────────────────────────────────────────

export default async function adminRoutes(fastify: FastifyInstance) {

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/admin/agencies
  // Returns ALL agencies on the platform with owner name, trip count, balance.
  // Admin only.
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/admin/agencies',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const monthAgo = monthStart();

        const rows = await db
          .select({
            id:         agencies.id,
            name:       agencies.name,
            phone:      agencies.phone,
            email:      agencies.email,
            state:      agencies.state,
            created_at: agencies.created_at,
          })
          .from(agencies)
          .orderBy(desc(agencies.created_at));

        // Enrich with owner user + trip count + wallet balance in parallel
        const enriched = await Promise.all(rows.map(async (agency) => {
          const [ownerRow] = await db
            .select({ name: users.name, phone: users.phone, is_active: users.is_active })
            .from(users)
            .where(and(eq(users.agency_id, agency.id), eq(users.role, 'owner')))
            .limit(1);

          const [tripRow] = await db
            .select({ cnt: count() })
            .from(trips)
            .innerJoin(users, eq(trips.operator_id, users.id))
            .where(and(eq(users.agency_id, agency.id), gte(trips.created_at, monthAgo)));

          const wallet = await getOrCreateWallet(agency.id);

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
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/admin/agencies
  // Creates an agency AND its owner user in a single DB transaction.
  // Body: { name, ownerName, ownerPhone, ownerEmail, ownerPassword, state }
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/admin/agencies',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const admin: any = (req as any).user;
        const body: any  = req.body ?? {};

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
        const [existingPhone] = await db.select({ id: users.id }).from(users).where(eq(users.phone, ownerPhone)).limit(1);
        if (existingPhone) {
          return reply.status(409).send({ success: false, error: { code: 'PHONE_TAKEN', message: 'A user with this phone already exists' } });
        }

        const hash = await bcrypt.hash(ownerPassword, 12);

        // Create agency + owner in a DB transaction
        const result = await db.transaction(async (tx) => {
          const [agency] = await tx
            .insert(agencies)
            .values({
              name: name.trim(),
              phone: ownerPhone.trim(),
              email: ownerEmail?.trim() ?? '',
              state: state?.trim() ?? '',
            })
            .returning();

          const [owner] = await tx
            .insert(users)
            .values({
              agency_id: agency.id,
              name: ownerName.trim(),
              phone: ownerPhone.trim(),
              email: ownerEmail?.trim(),
              password_hash: hash,
              role: 'owner',
              is_active: true,
            })
            .returning({ id: users.id, name: users.name, phone: users.phone, role: users.role });

          // Create default wallet for new agency (0 trip credits)
          await tx.insert(agencyWallets).values({
            agency_id: agency.id,
            trips_remaining: 0,
            trips_used_this_month: 0,
            low_trip_threshold: 10,
          });

          return { agency, owner };
        });

        await logAdminAction(admin.id, 'CREATE_AGENCY', 'agency', result.agency.id, { ownerName, ownerPhone }, req.ip);

        return reply.status(201).send({ success: true, data: result });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/admin/agencies/:id/toggle
  // Activates or deactivates ALL users in the agency (blocks logins).
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/admin/agencies/:id/toggle',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const admin: any  = (req as any).user;
        const params: any = req.params;
        const agencyId    = params.id as string;

        // Get current active status from owner
        const [owner] = await db
          .select({ id: users.id, is_active: users.is_active })
          .from(users)
          .where(and(eq(users.agency_id, agencyId), eq(users.role, 'owner')))
          .limit(1);

        if (!owner) {
          return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Agency or owner not found' } });
        }

        const newStatus = !owner.is_active;

        // Toggle ALL users in agency
        await db
          .update(users)
          .set({ is_active: newStatus })
          .where(eq(users.agency_id, agencyId));

        await logAdminAction(admin.id, newStatus ? 'ACTIVATE_AGENCY' : 'DEACTIVATE_AGENCY', 'agency', agencyId, {}, req.ip);

        return reply.send({ success: true, data: { agency_id: agencyId, is_active: newStatus } });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/admin/wallet/summary
  // Platform-wide: total trips used, total credits topped-up, per-agency balances.
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/admin/wallet/summary',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        // Total trips consumed across all agencies
        const [deductionRow] = await db
          .select({ total: sum(walletTransactions.trips_amount) })
          .from(walletTransactions)
          .where(eq(walletTransactions.type, 'trip_deduction'));

        // Total trips credited (top-ups)
        const [topupRow] = await db
          .select({ total: sum(walletTransactions.trips_amount) })
          .from(walletTransactions)
          .where(eq(walletTransactions.type, 'trip_topup'));

        // Per-agency wallet overview
        const wallets = await db
          .select({
            agency_id:           agencyWallets.agency_id,
            trips_remaining:     agencyWallets.trips_remaining,
            trips_used_this_month: agencyWallets.trips_used_this_month,
            low_trip_threshold:  agencyWallets.low_trip_threshold,
            updated_at:          agencyWallets.updated_at,
          })
          .from(agencyWallets)
          .orderBy(agencyWallets.trips_remaining);

        // Attach agency names
        const agencyIds = wallets.map((w) => w.agency_id);
        const agencyRows = agencyIds.length > 0
          ? await db.select({ id: agencies.id, name: agencies.name }).from(agencies).where(inArray(agencies.id, agencyIds))
          : [];
        const agencyMap = Object.fromEntries(agencyRows.map((a) => [a.id, a.name]));

        const agencyWalletList = wallets.map((w) => ({
          agency_id:             w.agency_id,
          agency_name:           agencyMap[w.agency_id] ?? '—',
          trips_remaining:       w.trips_remaining,
          trips_used_this_month: w.trips_used_this_month,
          low_trips:             w.trips_remaining <= w.low_trip_threshold,
        }));

        const totalConsumed = Math.abs(Number(deductionRow?.total ?? 0));
        const totalTopups   = Number(topupRow?.total ?? 0);

        return reply.send({
          success: true,
          data: {
            total_trips_consumed:    totalConsumed,
            total_trips_credited:    totalTopups,
            agency_count:            agencyWalletList.length,
            low_trips_agencies:      agencyWalletList.filter((a) => a.low_trips).length,
            agency_wallets:          agencyWalletList,
          },
          meta: { timestamp: new Date().toISOString() },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/admin/wallet/:agencyId
  // Per-agency: wallet state + recent transactions (last 100)
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/admin/wallet/:agencyId',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const params: any = req.params;
        const agencyId    = params.agencyId as string;

        const [agency] = await db.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1);
        if (!agency) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Agency not found' } });

        const wallet = await getOrCreateWallet(agencyId);

        const transactions = await db
          .select()
          .from(walletTransactions)
          .where(eq(walletTransactions.agency_id, agencyId))
          .orderBy(desc(walletTransactions.created_at))
          .limit(100);

        return reply.send({
          success: true,
          data: {
            agency: { id: agency.id, name: agency.name },
            wallet: {
              trips_remaining:       wallet.trips_remaining,
              trips_used_this_month: wallet.trips_used_this_month,
              low_trip_threshold:    wallet.low_trip_threshold,
              low_trips:             wallet.trips_remaining <= wallet.low_trip_threshold,
            },
            transactions,
          },
          meta: { timestamp: new Date().toISOString() },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/admin/wallet/:agencyId/topup
  // Body: { trips, description?, reference_id? }
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/admin/wallet/:agencyId/topup',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const admin: any  = (req as any).user;
        const params: any = req.params;
        const body: any   = req.body ?? {};
        const agencyId    = params.agencyId as string;

        const tripsToAdd = Math.floor(Number(body.trips ?? 0));
        if (!tripsToAdd || tripsToAdd <= 0) {
          return reply.status(400).send({ success: false, error: { code: 'INVALID_AMOUNT', message: '`trips` must be a positive integer' } });
        }

        const [agency] = await db.select({ name: agencies.name }).from(agencies).where(eq(agencies.id, agencyId)).limit(1);
        if (!agency) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Agency not found' } });

        const { tripsRemainingAfter } = await topUpTrips(
          agencyId, tripsToAdd,
          body.description ?? `Admin top-up of ${tripsToAdd} trip(s)`,
          body.reference_id,
        );

        await logAdminAction(admin.id, 'TOPUP_AGENCY_WALLET', 'wallet', agencyId, { tripsToAdd }, req.ip);

        return reply.send({
          success: true,
          data: {
            agency_id: agencyId,
            trips_added: tripsToAdd,
            trips_remaining: tripsRemainingAfter,
          },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // PUT /api/admin/wallet/:agencyId/config
  // Body: { low_trip_threshold? }
  // ───────────────────────────────────────────────────────────────────────────
  fastify.put(
    '/admin/wallet/:agencyId/config',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const admin: any  = (req as any).user;
        const params: any = req.params;
        const body: any   = req.body ?? {};
        const agencyId    = params.agencyId as string;

        const updates: { low_trip_threshold?: number } = {};
        if (body.low_trip_threshold !== undefined)
          updates.low_trip_threshold = Math.floor(Number(body.low_trip_threshold));

        if (Object.keys(updates).length === 0) {
          return reply.status(400).send({ success: false, error: { code: 'NO_FIELDS', message: 'Provide low_trip_threshold' } });
        }

        const updated = await updateWalletConfig(agencyId, updates);

        await logAdminAction(admin.id, 'UPDATE_WALLET_CONFIG', 'wallet', agencyId, body, req.ip);

        return reply.send({
          success: true,
          data: {
            agency_id: agencyId,
            low_trip_threshold: updated.low_trip_threshold,
          },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/admin/health
  // Platform-wide snapshot: agencies, users, active trips, alerts today.
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/admin/health',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const dayStart = todayStart();

        const [[agencyRow], [userRow], [tripRow], [alertRow], [activeRow]] = await Promise.all([
          db.select({ cnt: count() }).from(agencies),
          db.select({ cnt: count() }).from(users),
          db.select({ cnt: count() }).from(trips),
          db.select({ cnt: count() }).from(tripPassengers).where(and(
            eq(tripPassengers.alert_status, 'sent'),
            gte(tripPassengers.alert_sent_at, dayStart)
          )),
          db.select({ cnt: count() }).from(trips).where(eq(trips.status, 'active')),
        ]);

        // DB connectivity check via raw query
        let dbStatus = 'ok';
        try { await db.execute(sql`SELECT 1`); } catch { dbStatus = 'error'; }

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
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/admin/audit-logs
  // Last 200 admin audit log entries. Query: ?entity_type=agency&action=CREATE
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/admin/audit-logs',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const query: any = req.query ?? {};
        const conditions: any[] = [];
        if (query.entity_type) conditions.push(eq(auditLogs.entity_type, query.entity_type));
        if (query.action)      conditions.push(eq(auditLogs.action, query.action));

        const logs = await db
          .select({
            id:          auditLogs.id,
            action:      auditLogs.action,
            entity_type: auditLogs.entity_type,
            entity_id:   auditLogs.entity_id,
            metadata:    auditLogs.metadata,
            ip_address:  auditLogs.ip_address,
            created_at:  auditLogs.created_at,
            user_id:     auditLogs.user_id,
          })
          .from(auditLogs)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(auditLogs.created_at))
          .limit(200);

        // Enrich with user name
        const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))] as string[];
        const userRows = userIds.length > 0
          ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds))
          : [];
        const userMap = Object.fromEntries(userRows.map((u) => [u.id, u.name]));

        return reply.send({
          success: true,
          data: logs.map((l) => ({ ...l, actor_name: userMap[l.user_id ?? ''] ?? 'System' })),
          meta: { count: logs.length, timestamp: new Date().toISOString() },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );
  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/admin/invites
  // List all agency invites
  // ───────────────────────────────────────────────────────────────────────────
  // List all pending invites
  fastify.get(
    '/admin/agencies/invites',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const rows = await db
          .select({
            id: agencyInvites.id,
            phone: agencyInvites.phone,
            invite_token: agencyInvites.invite_token,
            status: agencyInvites.status,
            expires_at: agencyInvites.expires_at,
            created_at: agencyInvites.created_at,
            accepted_at: agencyInvites.accepted_at,
          })
          .from(agencyInvites)
          .orderBy(desc(agencyInvites.created_at));

        return reply.send({
          success: true,
          data: rows,
          meta: { count: rows.length, timestamp: new Date().toISOString() },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // POST /api/admin/agencies/invite
  // Create a new agency invite
  fastify.post(
    '/admin/agencies/invite',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const admin: any = (req as any).user;
        const body: any = req.body ?? {};

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
        } else if (!phone.startsWith('+')) {
          normalizedPhone = `+${phone}`;
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days validity

        const [invite] = await db
          .insert(agencyInvites)
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
      } catch (err) { return handleError(reply, err); }
    }
  );

  // POST /api/admin/agencies/invite/:id/resend
  fastify.post(
    '/admin/agencies/invite/:id/resend',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const admin: any = (req as any).user;
        const { id } = req.params as { id: string };

        const [invite] = await db
          .select()
          .from(agencyInvites)
          .where(eq(agencyInvites.id, id))
          .limit(1);

        if (!invite) {
          return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Invite not found' } });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const [updated] = await db
          .update(agencyInvites)
          .set({ 
            status: 'pending', 
            expires_at: expiresAt,
            created_at: new Date() // Refresh created_at for sorting
          })
          .where(eq(agencyInvites.id, id))
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
      } catch (err) { return handleError(reply, err); }
    }
  );
}
