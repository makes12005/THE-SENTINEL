/**
 * Owner Module Routes — Sprint 8
 *
 * ALL endpoints are strictly scoped to the owner's agency_id (from JWT).
 * Cross-agency data access is impossible by design.
 *
 * GET  /api/owner/summary              — agency-wide KPIs
 * GET  /api/owner/operators            — list operators in agency
 * POST /api/owner/operators/:id/toggle — activate/deactivate operator
 * GET  /api/owner/trips                — all trips across all operators
 * GET  /api/owner/logs                 — all alert logs across agency
 * GET  /api/agency/profile             — agency name/phone/email
 * PUT  /api/agency/profile             — update agency profile
 * GET  /api/owner/wallet/transactions  — trip credit history
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../auth/auth.middleware';
import { db } from '../../db';
import {
  trips, tripPassengers, alertLogs, users, agencies, agencyWallets, walletTransactions,
} from '../../db/schema';
import {
  eq, and, gte, sql, count, desc, or, inArray, ne,
} from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { UserRole } from '../../lib/shared-types';

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

/**
 * Get all operator user IDs in the agency.
 * Used by multiple endpoints to scope trips to this agency.
 *
 * ⚠️ SECURITY: strictly filtered by agencyId from JWT — no cross-agency leak.
 */
async function getAgencyOperatorIds(agencyId: string): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.agency_id, agencyId),
        eq(users.role, 'operator')
      )
    );
  return rows.map((r) => r.id);
}

export default async function ownerRoutes(fastify: FastifyInstance) {

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/owner/summary
  // Returns agency-wide KPIs:
  //   total_operators, active_trips, passengers_today,
  //   alerts_sent_today, failed_alerts_today,
  //   trips_remaining, trips_used_this_month
  // ⚠️ All queries scoped to agencyId — no cross-agency access.
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/owner/summary',
    { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user: any = (req as any).user;
        const agencyId  = user.agencyId as string;
        const dayStart  = todayStart();

        // Total operators in agency
        const [opRow] = await db
          .select({ cnt: count() })
          .from(users)
          .where(
            and(
              eq(users.agency_id, agencyId),  // ← agency scope
              )
          );

        // Wallet info
        const [wallet] = await db
          .select({
            trips_remaining:       agencyWallets.trips_remaining,
            trips_used_this_month: agencyWallets.trips_used_this_month,
          })
          .from(agencyWallets)
          .where(eq(agencyWallets.agency_id, agencyId))
          .limit(1);

        const operatorIds = await getAgencyOperatorIds(agencyId);

        if (operatorIds.length === 0) {
          return reply.send({
            success: true,
            data: {
              total_operators:       Number(opRow?.cnt ?? 0),
              active_trips:          0,
              total_passengers_today: 0,
              alerts_sent_today:     0,
              failed_alerts_today:   0,
              trips_remaining:       wallet?.trips_remaining ?? 0,
              trips_used_this_month: wallet?.trips_used_this_month ?? 0,
            },
            meta: { timestamp: new Date().toISOString() },
          });
        }

        // Active trips across the whole agency
        const [activeRow] = await db
          .select({ cnt: count() })
          .from(trips)
          .where(
            and(
              eq(trips.status, 'active'),
              inArray(trips.operator_id, operatorIds)  // ← agency scope
            )
          );

        // Today's trips
        const todayTrips = await db
          .select({ id: trips.id })
          .from(trips)
          .where(
            and(
              gte(trips.created_at, dayStart),
              inArray(trips.operator_id, operatorIds)  // ← agency scope
            )
          );
        const todayTripIds = todayTrips.map((t) => t.id);

        let totalPassengersToday = 0;
        let alertsSentToday      = 0;
        let failedAlertsToday    = 0;

        if (todayTripIds.length > 0) {
          const [passRow] = await db
            .select({ cnt: count() })
            .from(tripPassengers)
            .where(inArray(tripPassengers.trip_id, todayTripIds));
          totalPassengersToday = Number(passRow?.cnt ?? 0);

          const [sentRow] = await db
            .select({ cnt: count() })
            .from(tripPassengers)
            .where(
              and(
                inArray(tripPassengers.trip_id, todayTripIds),
                eq(tripPassengers.alert_status, 'sent')
              )
            );
          alertsSentToday = Number(sentRow?.cnt ?? 0);

          const [failRow] = await db
            .select({ cnt: count() })
            .from(tripPassengers)
            .where(
              and(
                inArray(tripPassengers.trip_id, todayTripIds),
                eq(tripPassengers.alert_status, 'failed')
              )
            );
          failedAlertsToday = Number(failRow?.cnt ?? 0);
        }

        return reply.send({
          success: true,
          data: {
            total_operators:        Number(opRow?.cnt ?? 0),
            active_trips:           Number(activeRow?.cnt ?? 0),
            total_passengers_today: totalPassengersToday,
            alerts_sent_today:      alertsSentToday,
            failed_alerts_today:    failedAlertsToday,
            trips_remaining:        wallet?.trips_remaining ?? 0,
            trips_used_this_month:  wallet?.trips_used_this_month ?? 0,
          },
          meta: { timestamp: new Date().toISOString() },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/owner/operators
  // Returns all operators in this agency with trip count + last_active_at.
  // ⚠️ agency_id filter is the first WHERE clause.
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/owner/operators',
    { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user: any = (req as any).user;
        const agencyId  = user.agencyId as string;

        // Fetch operators with trip counts via correlated subquery
        const operators = await db
          .select({
            id:         users.id,
            name:       users.name,
            phone:      users.phone,
            is_active:  users.is_active,
            created_at: users.created_at,
            trips_created_count: sql<number>`
              (SELECT COUNT(*) FROM trips WHERE trips.operator_id = ${users.id})
            `.as('trips_created_count'),
            last_active_at: sql<string | null>`
              (SELECT MAX(trips.created_at) FROM trips WHERE trips.operator_id = ${users.id})
            `.as('last_active_at'),
          })
          .from(users)
          .where(
            and(
              eq(users.agency_id, agencyId),  // ← agency scope — CRITICAL
              eq(users.role, 'operator')
            )
          )
          .orderBy(desc(users.created_at));

        return reply.send({
          success: true,
          data: operators,
          meta: { count: operators.length, timestamp: new Date().toISOString() },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/owner/operators/:id/toggle
  // Activate or deactivate an operator.
  // ⚠️ Verifies operator belongs to the same agency before toggling.
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/owner/operators/:id/toggle',
    { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user: any    = (req as any).user;
        const agencyId     = user.agencyId as string;
        const params: any  = req.params;
        const operatorId   = params.id as string;

        // Fetch operator — MUST be in same agency and role=operator
        const [target] = await db
          .select({ id: users.id, is_active: users.is_active, agency_id: users.agency_id })
          .from(users)
          .where(
            and(
              eq(users.id, operatorId),
              eq(users.agency_id, agencyId),  // ← agency scope — CRITICAL
              eq(users.role, 'operator')
            )
          )
          .limit(1);

        if (!target) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Operator not found in your agency' },
          });
        }

        const newStatus = !target.is_active;

        await db
          .update(users)
          .set({ is_active: newStatus })
          .where(eq(users.id, operatorId));

        return reply.send({
          success: true,
          data: { id: operatorId, is_active: newStatus },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/owner/trips
  // All trips across all operators in this agency.
  // Query: ?status=active|scheduled|completed&date=YYYY-MM-DD&page=1
  // ⚠️ Scoped via operator_id IN (operators in this agency).
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/owner/trips',
    { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user: any  = (req as any).user;
        const agencyId   = user.agencyId as string;
        const query: any = req.query ?? {};

        const PAGE_SIZE = 50;
        const page      = Math.max(1, parseInt(query.page ?? '1', 10));
        const offset    = (page - 1) * PAGE_SIZE;

        const operatorIds = await getAgencyOperatorIds(agencyId);
        if (operatorIds.length === 0) {
          return reply.send({ success: true, data: [], meta: { page, page_size: PAGE_SIZE, total: 0 } });
        }

        // Build WHERE conditions — agency scope is first
        const conditions: any[] = [inArray(trips.operator_id, operatorIds)];
        if (query.status) conditions.push(eq(trips.status, query.status));
        if (query.date)   conditions.push(sql`${trips.scheduled_date} = ${query.date}`);

        const [countRow] = await db
          .select({ total: count() })
          .from(trips)
          .where(and(...conditions));

        const rows = await db
          .select({
            id:             trips.id,
            status:         trips.status,
            scheduled_date: trips.scheduled_date,
            started_at:     trips.started_at,
            created_at:     trips.created_at,
            operator_id:    trips.operator_id,
          })
          .from(trips)
          .where(and(...conditions))
          .orderBy(desc(trips.created_at))
          .limit(PAGE_SIZE)
          .offset(offset);

        // Enrich with operator + conductor names in a second query
        const allUserIds = [
          ...new Set(rows.map((r) => r.operator_id)),
        ];
        const userRows = allUserIds.length > 0
          ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, allUserIds))
          : [];
        const userMap = Object.fromEntries(userRows.map((u) => [u.id, u.name]));

        const enriched = rows.map((r) => ({
          ...r,
          operator_name: userMap[r.operator_id] ?? '—',
        }));

        return reply.send({
          success: true,
          data: enriched,
          meta: { page, page_size: PAGE_SIZE, total: Number(countRow?.total ?? 0), timestamp: new Date().toISOString() },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/owner/logs
  // All alert logs across the entire agency.
  // Query: ?date=YYYY-MM-DD&channel=call|sms|whatsapp|manual&status=success|failed&page=1
  // ⚠️ Scoped via operator_id → trips → passengers → alert_logs chain.
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/owner/logs',
    { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user: any  = (req as any).user;
        const agencyId   = user.agencyId as string;
        const query: any = req.query ?? {};

        const PAGE_SIZE = 50;
        const page      = Math.max(1, parseInt(query.page ?? '1', 10));
        const offset    = (page - 1) * PAGE_SIZE;

        // Step 1: get all agency trips via operator_id scope
        const operatorIds = await getAgencyOperatorIds(agencyId);
        if (operatorIds.length === 0) {
          return reply.send({ success: true, data: [], meta: { page, page_size: PAGE_SIZE, total: 0 } });
        }

        const agencyTrips = await db
          .select({ id: trips.id, operator_id: trips.operator_id })
          .from(trips)
          .where(inArray(trips.operator_id, operatorIds));  // ← agency scope
        const tripIds = agencyTrips.map((t) => t.id);

        if (tripIds.length === 0) {
          return reply.send({ success: true, data: [], meta: { page, page_size: PAGE_SIZE, total: 0 } });
        }

        // Step 2: get passengers in those trips
        const passengerRows = await db
          .select({ id: tripPassengers.id, trip_id: tripPassengers.trip_id })
          .from(tripPassengers)
          .where(inArray(tripPassengers.trip_id, tripIds));
        const passengerIds = passengerRows.map((p) => p.id);

        if (passengerIds.length === 0) {
          return reply.send({ success: true, data: [], meta: { page, page_size: PAGE_SIZE, total: 0 } });
        }

        // Build passenger_id → operator mapping
        const tripToOperator = Object.fromEntries(agencyTrips.map((t) => [t.id, t.operator_id]));
        const passengerToTrip = Object.fromEntries(passengerRows.map((p) => [p.id, p.trip_id]));

        // Step 3: build alertLogs conditions
        const conditions: any[] = [inArray(alertLogs.trip_passenger_id, passengerIds)];
        if (query.channel) conditions.push(eq(alertLogs.channel, query.channel));
        if (query.status)  conditions.push(eq(alertLogs.status,  query.status));
        if (query.date) {
          const start = new Date(query.date);
          start.setUTCHours(0, 0, 0, 0);
          conditions.push(gte(alertLogs.attempted_at, start));
        }

        const [countRow] = await db
          .select({ total: count() })
          .from(alertLogs)
          .where(and(...conditions));

        const logs = await db
          .select({
            id:              alertLogs.id,
            channel:         alertLogs.channel,
            status:          alertLogs.status,
            attempted_at:    alertLogs.attempted_at,
            response_code:   alertLogs.response_code,
            error_message:   alertLogs.error_message,
            passenger_name:  tripPassengers.passenger_name,
            passenger_phone: tripPassengers.passenger_phone,
            trip_id:         tripPassengers.trip_id,
            trip_passenger_id: alertLogs.trip_passenger_id,
          })
          .from(alertLogs)
          .innerJoin(tripPassengers, eq(alertLogs.trip_passenger_id, tripPassengers.id))
          .where(and(...conditions))
          .orderBy(desc(alertLogs.attempted_at))
          .limit(PAGE_SIZE)
          .offset(offset);

        // Enrich with operator names
        const operatorIdSet = [...new Set(
          logs.map((l) => tripToOperator[passengerToTrip[l.trip_passenger_id] ?? ''] ?? '')
        )].filter(Boolean);
        const opRows = operatorIdSet.length > 0
          ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, operatorIdSet))
          : [];
        const opNameMap = Object.fromEntries(opRows.map((u) => [u.id, u.name]));

        const enriched = logs.map((l) => {
          const tripId    = passengerToTrip[l.trip_passenger_id] ?? '';
          const opId      = tripToOperator[tripId] ?? '';
          return { ...l, operator_name: opNameMap[opId] ?? '—' };
        });

        return reply.send({
          success: true,
          data: enriched,
          meta: { page, page_size: PAGE_SIZE, total: Number(countRow?.total ?? 0), timestamp: new Date().toISOString() },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/agency/profile
  // Returns the agency profile for the authenticated user.
  // ⚠️ agencyId extracted from JWT — owner can only see their own agency.
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/agency/profile',
    { preHandler: [requireAuth([UserRole.OWNER, UserRole.OPERATOR, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user: any = (req as any).user;
        const agencyId  = user.agencyId as string;

        const [agency] = await db
          .select({
            id:    agencies.id,
            name:  agencies.name,
            phone: agencies.phone,
            email: agencies.email,
            state: agencies.state,
          })
          .from(agencies)
          .where(eq(agencies.id, agencyId))  // ← strict agency scope
          .limit(1);

        if (!agency) {
          return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Agency not found' } });
        }

        return reply.send({ success: true, data: agency });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // PUT /api/agency/profile
  // Body: { name?, phone?, email?, state? }
  // ⚠️ agencyId from JWT — cannot update another agency.
  // ───────────────────────────────────────────────────────────────────────────
  fastify.put(
    '/agency/profile',
    { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user: any = (req as any).user;
        const agencyId  = user.agencyId as string;
        const body: any = req.body ?? {};

        const updateData: Partial<{ name: string; phone: string; email: string; state: string }> = {};
        if (body.name)  updateData.name  = body.name.trim();
        if (body.phone) updateData.phone = body.phone.trim();
        if (body.email) updateData.email = body.email.trim();
        if (body.state) updateData.state = body.state.trim();

        if (Object.keys(updateData).length === 0) {
          return reply.status(400).send({ success: false, error: { code: 'NO_FIELDS', message: 'No fields to update' } });
        }

        const [updated] = await db
          .update(agencies)
          .set(updateData)
          .where(eq(agencies.id, agencyId))  // ← strict agency scope
          .returning({ id: agencies.id, name: agencies.name, phone: agencies.phone, email: agencies.email });

        return reply.send({ success: true, data: updated });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/owner/operators
  // Creates a new operator under this agency.
  // Body: { name, phone, password }
  // ⚠️ agency_id from JWT — operator is always assigned to caller's agency.
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/owner/operators',
    { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user: any = (req as any).user;
        const agencyId  = user.agencyId as string;
        const body: any = req.body ?? {};

        const { name, phone, password } = body;
        if (!name || !phone || !password) {
          return reply.status(400).send({ success: false, error: { code: 'MISSING_FIELDS', message: 'name, phone, and password are required' } });
        }
        if (!/^\+91\d{10}$/.test(phone)) {
          return reply.status(400).send({ success: false, error: { code: 'INVALID_PHONE', message: 'Phone must be in E.164 format: +91XXXXXXXXXX' } });
        }

        const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
        if (existing) {
          return reply.status(409).send({ success: false, error: { code: 'PHONE_TAKEN', message: 'A user with this phone already exists' } });
        }

        const hash = await bcrypt.hash(password, 12);
        const [newOp] = await db
          .insert(users)
          .values({
            agency_id:     agencyId,  // ← always caller's agency
            name:          name.trim(),
            phone:         phone.trim(),
            password_hash: hash,
            role:          'operator',
            is_active:     true,
          })
          .returning({ id: users.id, name: users.name, phone: users.phone, role: users.role, is_active: users.is_active });

        return reply.status(201).send({ success: true, data: newOp });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/owner/wallet/transactions
  // Trip credit history for the authenticated owner's agency.
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/owner/wallet/transactions',
    { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user: any = (req as any).user;
        const agencyId  = user.agencyId as string;
        const query: any = req.query ?? {};

        const PAGE_SIZE = 50;
        const page      = Math.max(1, parseInt(query.page ?? '1', 10));
        const offset    = (page - 1) * PAGE_SIZE;

        const [countRow] = await db
          .select({ total: count() })
          .from(walletTransactions)
          .where(eq(walletTransactions.agency_id, agencyId));

        const rows = await db
          .select()
          .from(walletTransactions)
          .where(eq(walletTransactions.agency_id, agencyId))
          .orderBy(desc(walletTransactions.created_at))
          .limit(PAGE_SIZE)
          .offset(offset);

        return reply.send({
          success: true,
          data: rows,
          meta: {
            page,
            page_size: PAGE_SIZE,
            total: Number(countRow?.total ?? 0),
            timestamp: new Date().toISOString(),
          },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );
}
