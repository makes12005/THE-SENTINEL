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
 * Billing:
 *   GET  /api/admin/billing/summary      — platform-wide revenue + per-agency balances
 *   GET  /api/admin/billing/:agencyId    — agency billing detail + transactions
 *   POST /api/admin/billing/:agencyId/topup      — add balance to agency
 *   PUT  /api/admin/billing/:agencyId/config     — update per_alert_paise / threshold
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
  agencyBillingConfig, billingTransactions, auditLogs,
} from '../../db/schema';
import {
  eq, and, sql, count, desc, sum, gte, inArray,
} from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { UserRole } from '@busalert/shared-types';
import {
  topUpBalance,
  updateBillingConfig,
  getOrCreateBillingConfig,
} from '../billing/billing.service';

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

        // Enrich with owner user + trip count + balance in parallel
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

          const billing = await getOrCreateBillingConfig(agency.id);

          return {
            ...agency,
            owner_name: ownerRow?.name ?? '—',
            owner_phone: ownerRow?.phone ?? '—',
            is_active: ownerRow?.is_active ?? true,
            trips_this_month: Number(tripRow?.cnt ?? 0),
            balance_paise: billing.balance_paise,
            balance_rupees: billing.balance_paise / 100,
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

          // Create default billing config for new agency
          await tx.insert(agencyBillingConfig).values({
            agency_id: agency.id,
            balance_paise: 0,
            per_alert_paise: 200,       // ₹2 per alert
            low_balance_threshold_paise: 10000, // ₹100
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
  // GET /api/admin/billing/summary
  // Platform-wide: total_revenue_paise, total_topups_paise, active agency count,
  // + per-agency balance summary list.
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/admin/billing/summary',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        // Total revenue (sum of alert_deductions, which are negative amounts)
        const [deductionRow] = await db
          .select({ total: sum(billingTransactions.amount_paise) })
          .from(billingTransactions)
          .where(eq(billingTransactions.type, 'alert_deduction'));

        // Total top-ups ever
        const [topupRow] = await db
          .select({ total: sum(billingTransactions.amount_paise) })
          .from(billingTransactions)
          .where(eq(billingTransactions.type, 'topup'));

        // Per-agency balance overview
        const configs = await db
          .select({
            agency_id: agencyBillingConfig.agency_id,
            balance_paise: agencyBillingConfig.balance_paise,
            per_alert_paise: agencyBillingConfig.per_alert_paise,
            low_balance_threshold_paise: agencyBillingConfig.low_balance_threshold_paise,
            updated_at: agencyBillingConfig.updated_at,
          })
          .from(agencyBillingConfig)
          .orderBy(agencyBillingConfig.balance_paise);

        // Attach agency names
        const agencyIds = configs.map((c) => c.agency_id);
        const agencyRows = agencyIds.length > 0
          ? await db.select({ id: agencies.id, name: agencies.name }).from(agencies).where(inArray(agencies.id, agencyIds))
          : [];
        const agencyMap = Object.fromEntries(agencyRows.map((a) => [a.id, a.name]));

        const agencyBalances = configs.map((c) => ({
          agency_id: c.agency_id,
          agency_name: agencyMap[c.agency_id] ?? '—',
          balance_paise: c.balance_paise,
          balance_rupees: c.balance_paise / 100,
          per_alert_rupees: c.per_alert_paise / 100,
          low_balance: c.balance_paise <= c.low_balance_threshold_paise,
        }));

        const revenueRaw = Math.abs(Number(deductionRow?.total ?? 0));
        const topupsRaw  = Number(topupRow?.total ?? 0);

        return reply.send({
          success: true,
          data: {
            total_revenue_paise:  revenueRaw,
            total_revenue_rupees: revenueRaw / 100,
            total_topups_paise:   topupsRaw,
            total_topups_rupees:  topupsRaw / 100,
            agency_count: agencyBalances.length,
            low_balance_agencies: agencyBalances.filter((a) => a.low_balance).length,
            agency_balances: agencyBalances,
          },
          meta: { timestamp: new Date().toISOString() },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/admin/billing/:agencyId
  // Per-agency: config, recent transactions (last 100)
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/admin/billing/:agencyId',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const params: any = req.params;
        const agencyId    = params.agencyId as string;

        const [agency] = await db.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1);
        if (!agency) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Agency not found' } });

        const config = await getOrCreateBillingConfig(agencyId);

        const transactions = await db
          .select()
          .from(billingTransactions)
          .where(eq(billingTransactions.agency_id, agencyId))
          .orderBy(desc(billingTransactions.created_at))
          .limit(100);

        return reply.send({
          success: true,
          data: {
            agency: { id: agency.id, name: agency.name },
            billing: {
              balance_paise: config.balance_paise,
              balance_rupees: config.balance_paise / 100,
              per_alert_paise: config.per_alert_paise,
              per_alert_rupees: config.per_alert_paise / 100,
              low_balance_threshold_paise: config.low_balance_threshold_paise,
              low_balance_threshold_rupees: config.low_balance_threshold_paise / 100,
              low_balance: config.balance_paise <= config.low_balance_threshold_paise,
            },
            transactions: transactions.map((t) => ({
              ...t,
              amount_rupees: t.amount_paise / 100,
              balance_after_rupees: t.balance_after_paise / 100,
            })),
          },
          meta: { timestamp: new Date().toISOString() },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/admin/billing/:agencyId/topup
  // Body: { amount_rupees, description?, reference_id? }
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/admin/billing/:agencyId/topup',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const admin: any  = (req as any).user;
        const params: any = req.params;
        const body: any   = req.body ?? {};
        const agencyId    = params.agencyId as string;

        const amountRupees = Number(body.amount_rupees ?? 0);
        if (!amountRupees || amountRupees <= 0) {
          return reply.status(400).send({ success: false, error: { code: 'INVALID_AMOUNT', message: 'amount_rupees must be a positive number' } });
        }

        const [agency] = await db.select({ name: agencies.name }).from(agencies).where(eq(agencies.id, agencyId)).limit(1);
        if (!agency) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Agency not found' } });

        const amountPaise = Math.round(amountRupees * 100);
        const { balancePaiseAfter } = await topUpBalance(
          agencyId, amountPaise,
          body.description ?? `Admin top-up ₹${amountRupees}`,
          body.reference_id
        );

        await logAdminAction(admin.id, 'TOPUP_AGENCY', 'billing', agencyId, { amountRupees }, req.ip);

        return reply.send({
          success: true,
          data: {
            agency_id: agencyId,
            amount_rupees: amountRupees,
            new_balance_rupees: balancePaiseAfter / 100,
          },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // PUT /api/admin/billing/:agencyId/config
  // Body: { per_alert_rupees?, low_balance_threshold_rupees? }
  // ───────────────────────────────────────────────────────────────────────────
  fastify.put(
    '/admin/billing/:agencyId/config',
    { preHandler: [requireAuth([UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const admin: any  = (req as any).user;
        const params: any = req.params;
        const body: any   = req.body ?? {};
        const agencyId    = params.agencyId as string;

        const updates: { per_alert_paise?: number; low_balance_threshold_paise?: number } = {};
        if (body.per_alert_rupees !== undefined)
          updates.per_alert_paise = Math.round(Number(body.per_alert_rupees) * 100);
        if (body.low_balance_threshold_rupees !== undefined)
          updates.low_balance_threshold_paise = Math.round(Number(body.low_balance_threshold_rupees) * 100);

        if (Object.keys(updates).length === 0) {
          return reply.status(400).send({ success: false, error: { code: 'NO_FIELDS', message: 'Provide per_alert_rupees or low_balance_threshold_rupees' } });
        }

        const updated = await updateBillingConfig(agencyId, updates);

        await logAdminAction(admin.id, 'UPDATE_BILLING_CONFIG', 'billing', agencyId, body, req.ip);

        return reply.send({
          success: true,
          data: {
            agency_id: agencyId,
            per_alert_rupees: updated.per_alert_paise / 100,
            low_balance_threshold_rupees: updated.low_balance_threshold_paise / 100,
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
}
