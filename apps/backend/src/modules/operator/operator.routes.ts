/**
 * Operator Module Routes — Sprint 7
 *
 * GET  /api/operator/summary     — dashboard summary (operator | owner)
 * POST /api/agency/members       — add conductor or driver (operator)
 * GET  /api/agency/members       — list conductors + drivers (operator | owner)
 * GET  /api/logs/alerts          — paginated alert logs (operator | owner)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../auth/auth.middleware';
import { db } from '../../db';
import {
  trips, tripPassengers, alertLogs, users, agencies,
} from '../../db/schema';
import {
  eq, and, gte, sql, count, desc, or, inArray,
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

// ── Midnight of today in UTC ────────────────────────────────────────────────
function todayStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export default async function operatorRoutes(fastify: FastifyInstance) {

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/operator/summary
  // Returns: active_trips, total_passengers_today, alerts_sent_today,
  //          failed_alerts_today
  // ─────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/operator/summary',
    { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user: any = (req as any).user;
        const agencyId  = user.agencyId as string;
        const dayStart  = todayStart();

        // Active trips for this agency
        const [activeRow] = await db
          .select({ active_trips: count() })
          .from(trips)
          .where(
            and(
              eq(trips.status, 'active'),
              // trips belong to agency via operator_id
              inArray(
                trips.operator_id,
                db.select({ id: users.id }).from(users).where(eq(users.agency_id, agencyId))
              )
            )
          );

        // Today's trips for this agency
        const todayTrips = await db
          .select({ id: trips.id })
          .from(trips)
          .where(
            and(
              gte(trips.created_at, dayStart),
              inArray(
                trips.operator_id,
                db.select({ id: users.id }).from(users).where(eq(users.agency_id, agencyId))
              )
            )
          );

        const todayTripIds = todayTrips.map((t) => t.id);

        let totalPassengersToday = 0;
        let alertsSentToday = 0;
        let failedAlertsToday = 0;

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
            active_trips:            Number(activeRow?.active_trips ?? 0),
            total_passengers_today:  totalPassengersToday,
            alerts_sent_today:       alertsSentToday,
            failed_alerts_today:     failedAlertsToday,
          },
          meta: { timestamp: new Date().toISOString() },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/agency/members
  // Body: { name, phone, password, role: 'conductor' | 'driver' }
  // Creates a new user attached to the operator's agency
  // ─────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/agency/members',
    { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user: any  = (req as any).user;
        const agencyId   = user.agencyId as string;
        const body: any  = req.body;

        const { name, phone, password, role } = body ?? {};

        // Validate fields
        if (!name || !phone || !password || !role) {
          return reply.status(400).send({ success: false, error: { code: 'MISSING_FIELDS', message: 'name, phone, password, and role are required' } });
        }
        if (!['conductor', 'driver'].includes(role)) {
          return reply.status(400).send({ success: false, error: { code: 'INVALID_ROLE', message: 'role must be conductor or driver' } });
        }
        if (!/^\+91\d{10}$/.test(phone)) {
          return reply.status(400).send({ success: false, error: { code: 'INVALID_PHONE', message: 'phone must be in E.164 format: +91XXXXXXXXXX' } });
        }

        // Check duplicate phone
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.phone, phone))
          .limit(1);
        if (existing) {
          return reply.status(409).send({ success: false, error: { code: 'PHONE_TAKEN', message: 'A user with this phone already exists' } });
        }

        const hash = await bcrypt.hash(password, 12);

        const [newUser] = await db
          .insert(users)
          .values({
            agency_id:     agencyId,
            name:          name.trim(),
            phone:         phone.trim(),
            password_hash: hash,
            role:          role as 'conductor' | 'driver',
            is_active:     true,
          })
          .returning({
            id:        users.id,
            name:      users.name,
            phone:     users.phone,
            role:      users.role,
            is_active: users.is_active,
          });

        return reply.status(201).send({ success: true, data: newUser });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/agency/members
  // Returns all conductors + drivers for this agency
  // ─────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/agency/members',
    { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user: any = (req as any).user;
        const agencyId  = user.agencyId as string;

        const members = await db
          .select({
            id:         users.id,
            name:       users.name,
            phone:      users.phone,
            role:       users.role,
            is_active:  users.is_active,
            created_at: users.created_at,
          })
          .from(users)
          .where(
            and(
              eq(users.agency_id, agencyId),
              // Only conductors and drivers (operators/owners view their staff)
              sql`${users.role} IN ('conductor', 'driver')`
            )
          )
          .orderBy(desc(users.created_at));

        return reply.send({
          success: true,
          data: members,
          meta: { count: members.length, timestamp: new Date().toISOString() },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/logs/alerts
  // Query: ?date=YYYY-MM-DD&channel=call|sms|whatsapp|manual&status=success|failed
  //        &page=1 (50 per page)
  // Returns paginated alertLogs for this agency's trips
  // ─────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/logs/alert-logs',
    { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const user: any  = (req as any).user;
        const agencyId   = user.agencyId as string;
        const query: any = req.query ?? {};

        const PAGE_SIZE = 50;
        const page      = Math.max(1, parseInt(query.page ?? '1', 10));
        const offset    = (page - 1) * PAGE_SIZE;

        // Build filter list step-by-step
        // 1. Get agency trip IDs
        const agencyTrips = await db
          .select({ id: trips.id })
          .from(trips)
          .where(
            inArray(
              trips.operator_id,
              db.select({ id: users.id }).from(users).where(eq(users.agency_id, agencyId))
            )
          );
        const tripIds = agencyTrips.map((t) => t.id);

        if (tripIds.length === 0) {
          return reply.send({ success: true, data: [], meta: { page, page_size: PAGE_SIZE, total: 0 } });
        }

        // 2. Get passenger IDs in those trips (optionally filtered by date)
        let passQuery = db
          .select({ id: tripPassengers.id })
          .from(tripPassengers)
          .where(inArray(tripPassengers.trip_id, tripIds));

        const passengerRows = await passQuery;
        const passengerIds  = passengerRows.map((p) => p.id);

        if (passengerIds.length === 0) {
          return reply.send({ success: true, data: [], meta: { page, page_size: PAGE_SIZE, total: 0 } });
        }

        // 3. Build alertLogs filter conditions
        const conditions: ReturnType<typeof eq>[] = [
          inArray(alertLogs.trip_passenger_id, passengerIds) as any,
        ];
        if (query.channel) conditions.push(eq(alertLogs.channel, query.channel) as any);
        if (query.status)  conditions.push(eq(alertLogs.status, query.status) as any);
        if (query.date) {
          const start = new Date(query.date);
          start.setUTCHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setUTCDate(end.getUTCDate() + 1);
          conditions.push(gte(alertLogs.attempted_at, start) as any);
        }

        // 4. Count + paginated fetch
        const [countRow] = await db
          .select({ total: count() })
          .from(alertLogs)
          .where(and(...conditions as any[]));

        const logs = await db
          .select({
            id:               alertLogs.id,
            channel:          alertLogs.channel,
            status:           alertLogs.status,
            attempted_at:     alertLogs.attempted_at,
            response_code:    alertLogs.response_code,
            error_message:    alertLogs.error_message,
            // join passenger info
            passenger_name:   tripPassengers.passenger_name,
            passenger_phone:  tripPassengers.passenger_phone,
            trip_id:          tripPassengers.trip_id,
          })
          .from(alertLogs)
          .innerJoin(tripPassengers, eq(alertLogs.trip_passenger_id, tripPassengers.id))
          .where(and(...conditions as any[]))
          .orderBy(desc(alertLogs.attempted_at))
          .limit(PAGE_SIZE)
          .offset(offset);

        return reply.send({
          success: true,
          data: logs,
          meta: {
            page,
            page_size:  PAGE_SIZE,
            total:      Number(countRow?.total ?? 0),
            timestamp:  new Date().toISOString(),
          },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );
}
