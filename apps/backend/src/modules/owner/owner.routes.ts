import bcrypt from 'bcryptjs';
import { and, count, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../../db';
import {
  agencies,
  agencyWallets,
  alertLogs,
  buses,
  conductorLocations,
  routes,
  tripPassengers,
  trips,
  users,
  walletTransactions,
} from '../../db/schema';
import { UserRole } from '../../lib/shared-types';
import { requireAuth } from '../auth/auth.middleware';
import { handleOperatorDeactivation } from '../operator/orphan.service';

function handleError(reply: FastifyReply, err: any) {
  return reply.status(err.statusCode ?? 500).send({
    success: false,
    error: {
      code: err.code ?? 'REQUEST_FAILED',
      message: err.message ?? 'An error occurred',
    },
  });
}

/** Today's date YYYY-MM-DD in Asia/Kolkata */
function istYYYYMMDD(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function istDayStart(d = new Date()): Date {
  const ymd = istYYYYMMDD(d);
  return new Date(`${ymd}T00:00:00+05:30`);
}

function istNextDayStart(d = new Date()): Date {
  return new Date(istDayStart(d).getTime() + 24 * 60 * 60 * 1000);
}

async function getAgencyOperatorIds(agencyId: string) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.agency_id, agencyId), eq(users.role, 'operator')));

  return rows.map((row) => row.id);
}

export default async function ownerRoutes(fastify: FastifyInstance) {
  fastify.get('/owner/summary', { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const agencyId = req.user.agencyId as string;
      const operatorIds = await getAgencyOperatorIds(agencyId);
      const dayStart = istDayStart();
      const dayEnd = istNextDayStart();

      const [operatorCount] = await db
        .select({ cnt: count() })
        .from(users)
        .where(and(eq(users.agency_id, agencyId), eq(users.role, 'operator')));

      const [wallet] = await db
        .select({
          trips_remaining: agencyWallets.trips_remaining,
          trips_used_this_month: agencyWallets.trips_used_this_month,
        })
        .from(agencyWallets)
        .where(eq(agencyWallets.agency_id, agencyId))
        .limit(1);

      if (!operatorIds.length) {
        return reply.send({
          success: true,
          data: {
            total_operators: Number(operatorCount?.cnt ?? 0),
            active_trips: 0,
            total_passengers_today: 0,
            alerts_sent_today: 0,
            failed_alerts_today: 0,
            trips_remaining: wallet?.trips_remaining ?? 0,
            trips_used_this_month: wallet?.trips_used_this_month ?? 0,
            unassigned_trips: 0,
          },
        });
      }

      const [activeTrips] = await db
        .select({ cnt: count() })
        .from(trips)
        .innerJoin(routes, eq(routes.id, trips.route_id))
        .where(and(eq(routes.agency_id, agencyId), eq(trips.status, 'active')));

      const todayTrips = await db
        .select({ id: trips.id })
        .from(trips)
        .innerJoin(routes, eq(routes.id, trips.route_id))
        .where(
          and(eq(routes.agency_id, agencyId), gte(trips.created_at, dayStart), lt(trips.created_at, dayEnd)),
        );

      const todayTripIds = todayTrips.map((trip) => trip.id);

      let totalPassengersToday = 0;
      let alertsSentToday = 0;
      let failedAlertsToday = 0;

      if (todayTripIds.length) {
        const [passengersRow] = await db
          .select({ cnt: count() })
          .from(tripPassengers)
          .where(inArray(tripPassengers.trip_id, todayTripIds));

        const [sentRow] = await db
          .select({ cnt: count() })
          .from(tripPassengers)
          .where(and(inArray(tripPassengers.trip_id, todayTripIds), eq(tripPassengers.alert_status, 'sent')));

        const [failedRow] = await db
          .select({ cnt: count() })
          .from(tripPassengers)
          .where(and(inArray(tripPassengers.trip_id, todayTripIds), eq(tripPassengers.alert_status, 'failed')));

        totalPassengersToday = Number(passengersRow?.cnt ?? 0);
        alertsSentToday = Number(sentRow?.cnt ?? 0);
        failedAlertsToday = Number(failedRow?.cnt ?? 0);
      }

      const [unassignedTrips] = await db
        .select({ cnt: count() })
        .from(trips)
        .innerJoin(routes, eq(routes.id, trips.route_id))
        .where(and(eq(routes.agency_id, agencyId), sql`${trips.assigned_operator_id} is null`, sql`${trips.status} != 'completed'`));

      return reply.send({
        success: true,
        data: {
          total_operators: Number(operatorCount?.cnt ?? 0),
          active_trips: Number(activeTrips?.cnt ?? 0),
          total_passengers_today: totalPassengersToday,
          alerts_sent_today: alertsSentToday,
          failed_alerts_today: failedAlertsToday,
          trips_remaining: wallet?.trips_remaining ?? 0,
          trips_used_this_month: wallet?.trips_used_this_month ?? 0,
          unassigned_trips: Number(unassignedTrips?.cnt ?? 0),
        },
      });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.get('/owner/operators', { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const agencyId = req.user.agencyId as string;
      const operators = await db.execute<{
        id: string;
        name: string;
        phone: string | null;
        role: string;
        is_active: boolean;
        created_at: string;
        trips_created_count: string;
        last_active_at: string | null;
      }>(sql`
        select
          u.id,
          u.name,
          u.phone,
          u.role,
          u.is_active,
          u.created_at::text as created_at,
          count(t.id)::text as trips_created_count,
          max(t.created_at)::text as last_active_at
        from users u
        left join trips t on t.operator_id = u.id
        where u.agency_id = ${agencyId} and u.role = 'operator'
        group by u.id
        order by u.created_at desc
      `);

      return reply.send({
        success: true,
        data: operators.map((op) => ({ ...op, trips_created_count: Number(op.trips_created_count ?? 0) })),
      });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.get('/owner/operators/:id', { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const agencyId = req.user.agencyId as string;
      const operatorId = (req.params as { id: string }).id;
      const rows = await db.execute<{
        id: string;
        name: string;
        phone: string | null;
        role: string;
        is_active: boolean;
        created_at: string;
        trips_created_count: string;
        last_active_at: string | null;
      }>(sql`
        select
          u.id,
          u.name,
          u.phone,
          u.role,
          u.is_active,
          u.created_at::text as created_at,
          count(t.id)::text as trips_created_count,
          max(t.created_at)::text as last_active_at
        from users u
        left join trips t on t.operator_id = u.id
        where u.agency_id = ${agencyId} and u.role = 'operator' and u.id = ${operatorId}
        group by u.id
        limit 1
      `);

      const op = rows[0];
      if (!op) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Operator not found in your agency' } });
      }

      return reply.send({
        success: true,
        data: { ...op, trips_created_count: Number(op.trips_created_count ?? 0) },
      });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.post('/owner/operators', { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const agencyId = req.user.agencyId as string;
      const body = (req.body as { name?: string; phone?: string; password?: string }) ?? {};
      if (!body.name || !body.phone || !body.password) {
        return reply.status(400).send({ success: false, error: { code: 'MISSING_FIELDS', message: 'name, phone, and password are required' } });
      }

      if (!/^\+91\d{10}$/.test(body.phone.trim())) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_PHONE', message: 'Phone must be E.164 format: +91XXXXXXXXXX' },
        });
      }

      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, body.phone)).limit(1);
      if (existing) {
        return reply.status(409).send({ success: false, error: { code: 'PHONE_TAKEN', message: 'A user with this phone already exists' } });
      }

      const passwordHash = await bcrypt.hash(body.password, 12);
      const [operator] = await db
        .insert(users)
        .values({
          agency_id: agencyId,
          name: body.name.trim(),
          phone: body.phone.trim(),
          password_hash: passwordHash,
          role: 'operator',
          is_active: true,
          added_by: req.user.id,
        })
        .returning({ id: users.id, name: users.name, phone: users.phone, role: users.role, is_active: users.is_active, created_at: users.created_at });

      return reply.status(201).send({ success: true, data: operator });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.post('/owner/operators/:id/toggle', { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const agencyId = req.user.agencyId as string;
      const operatorId = (req.params as { id: string }).id;

      const [target] = await db
        .select({ id: users.id, is_active: users.is_active })
        .from(users)
        .where(and(eq(users.id, operatorId), eq(users.agency_id, agencyId), eq(users.role, 'operator')))
        .limit(1);

      if (!target) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Operator not found in your agency' } });
      }

      const nextStatus = !target.is_active;
      const [updated] = await db.update(users).set({ is_active: nextStatus }).where(eq(users.id, operatorId)).returning({ id: users.id, is_active: users.is_active });

      if (!nextStatus) {
        await handleOperatorDeactivation(operatorId, agencyId, req.user.id);
      }

      return reply.send({ success: true, data: updated });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.get('/owner/trips', { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const agencyId = req.user.agencyId as string;
      const query = (req.query as {
        status?: string;
        date?: string;
        page?: string;
        unassigned?: string;
        operator?: string;
        window?: string;
      }) ?? {};
      const page = Math.max(1, Number(query.page ?? 1));
      const pageSize = 50;
      const offset = (page - 1) * pageSize;

      const istToday = istYYYYMMDD();

      const whereParts = [
        sql`r.agency_id = ${agencyId}`,
        query.status ? sql`t.status = ${query.status}` : sql`true`,
        query.date ? sql`t.scheduled_date = ${query.date}` : sql`true`,
        query.unassigned === 'true' ? sql`t.assigned_to_operator_id is null` : sql`true`,
      ];

      if (!query.status) {
        if (query.window === 'today') {
          whereParts.push(sql`(t.scheduled_date = ${istToday}::date or t.status = 'active')`);
        } else if (query.window === 'upcoming') {
          whereParts.push(sql`(t.scheduled_date > ${istToday}::date and t.status <> 'completed')`);
        } else if (query.window === 'completed') {
          whereParts.push(sql`t.status = 'completed'`);
        }
      }

      if (query.operator?.trim()) {
        const pat = `%${query.operator.trim()}%`;
        whereParts.push(sql`(assigned_user.name ilike ${pat} or owner_user.name ilike ${pat})`);
      }

      const rows = await db.execute<{
        id: string;
        status: string;
        scheduled_date: string;
        started_at: string | null;
        created_at: string;
        owner_id: string;
        owner_name: string | null;
        assigned_operator_id: string | null;
        assigned_operator_name: string | null;
        conductor_name: string | null;
        route_name: string;
        from_city: string;
        to_city: string;
        passenger_count: string;
        pending_alerts: string;
        sent_alerts: string;
        failed_alerts: string;
        bus_number: string | null;
      }>(sql`
        select
          t.id,
          t.status,
          t.scheduled_date::text as scheduled_date,
          t.started_at::text as started_at,
          t.created_at::text as created_at,
          t.operator_id as owner_id,
          owner_user.name as owner_name,
          t.assigned_to_operator_id as assigned_operator_id,
          assigned_user.name as assigned_operator_name,
          conductor_user.name as conductor_name,
          r.name as route_name,
          r.from_city,
          r.to_city,
          count(tp.id)::text as passenger_count,
          count(tp.id) filter (where tp.alert_status = 'pending')::text as pending_alerts,
          count(tp.id) filter (where tp.alert_status = 'sent')::text as sent_alerts,
          count(tp.id) filter (where tp.alert_status = 'failed')::text as failed_alerts,
          b.number_plate as bus_number
        from trips t
        inner join routes r on r.id = t.route_id
        left join users owner_user on owner_user.id = t.operator_id
        left join users assigned_user on assigned_user.id = t.assigned_to_operator_id
        left join users conductor_user on conductor_user.id = t.conductor_id
        left join trip_passengers tp on tp.trip_id = t.id
        left join buses b on b.id = t.bus_id
        where ${sql.join(whereParts, sql` and `)}
        group by t.id, r.id, owner_user.name, assigned_user.name, conductor_user.name, b.number_plate
        order by t.created_at desc
        limit ${pageSize} offset ${offset}
      `);

      const [countRow] = await db.execute<{ total: string }>(sql`
        select count(distinct t.id)::text as total
        from trips t
        inner join routes r on r.id = t.route_id
        left join users owner_user on owner_user.id = t.operator_id
        left join users assigned_user on assigned_user.id = t.assigned_to_operator_id
        where ${sql.join(whereParts, sql` and `)}
      `);

      return reply.send({
        success: true,
        data: rows.map((row) => ({
          id: row.id,
          status: row.status,
          scheduled_date: row.scheduled_date,
          started_at: row.started_at,
          created_at: row.created_at,
          owned_by_operator_id: row.owner_id,
          owner_name: row.owner_name,
          assigned_operator_id: row.assigned_operator_id,
          assigned_operator_name: row.assigned_operator_name,
          conductor_name: row.conductor_name,
          route: {
            name: row.route_name,
            from_city: row.from_city,
            to_city: row.to_city,
          },
          passenger_count: Number(row.passenger_count ?? 0),
          alerts: {
            pending: Number(row.pending_alerts ?? 0),
            sent: Number(row.sent_alerts ?? 0),
            failed: Number(row.failed_alerts ?? 0),
          },
          bus_number: row.bus_number,
        })),
        meta: {
          page,
          page_size: pageSize,
          total: Number(countRow?.total ?? 0),
        },
      });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.get('/owner/logs', { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const agencyId = req.user.agencyId as string;
      const query = (req.query as { page?: string; channel?: string; status?: string; date?: string; operator?: string }) ?? {};
      const page = Math.max(1, Number(query.page ?? 1));
      const pageSize = 50;
      const offset = (page - 1) * pageSize;

      const whereParts = [
        sql`r.agency_id = ${agencyId}`,
        query.channel ? sql`al.channel = ${query.channel}` : sql`true`,
        query.status ? sql`al.status = ${query.status}` : sql`true`,
        query.date ? sql`(al.attempted_at at time zone 'Asia/Kolkata')::date = ${query.date}::date` : sql`true`,
        query.operator?.trim()
          ? sql`owner_user.name ilike ${'%' + query.operator.trim() + '%'}`
          : sql`true`,
      ];

      const rows = await db.execute<{
        id: string;
        channel: string;
        status: string;
        attempted_at: string;
        response_code: string | null;
        error_message: string | null;
        passenger_name: string;
        passenger_phone: string;
        owner_name: string | null;
      }>(sql`
        select
          al.id,
          al.channel,
          al.status,
          al.attempted_at::text as attempted_at,
          al.response_code,
          al.error_message,
          tp.passenger_name,
          tp.passenger_phone,
          owner_user.name as owner_name
        from alert_logs al
        inner join trip_passengers tp on tp.id = al.trip_passenger_id
        inner join trips t on t.id = tp.trip_id
        inner join routes r on r.id = t.route_id
        left join users owner_user on owner_user.id = t.operator_id
        where ${sql.join(whereParts, sql` and `)}
        order by al.attempted_at desc
        limit ${pageSize} offset ${offset}
      `);

      const [countRow] = await db.execute<{ total: string }>(sql`
        select count(*)::text as total
        from alert_logs al
        inner join trip_passengers tp on tp.id = al.trip_passenger_id
        inner join trips t on t.id = tp.trip_id
        inner join routes r on r.id = t.route_id
        left join users owner_user on owner_user.id = t.operator_id
        where ${sql.join(whereParts, sql` and `)}
      `);

      return reply.send({
        success: true,
        data: rows.map((row) => ({ ...row, operator_name: row.owner_name })),
        meta: { page, page_size: pageSize, total: Number(countRow?.total ?? 0) },
      });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.get('/agency/profile', { preHandler: [requireAuth([UserRole.OWNER, UserRole.OPERATOR, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const [agency] = await db
        .select({ id: agencies.id, name: agencies.name, phone: agencies.phone, email: agencies.email, state: agencies.state })
        .from(agencies)
        .where(eq(agencies.id, req.user.agencyId as string))
        .limit(1);

      if (!agency) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Agency not found' } });
      }

      return reply.send({ success: true, data: agency });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.put('/agency/profile', { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const body = (req.body as { name?: string; phone?: string; email?: string; state?: string }) ?? {};
      const patch: Partial<{ name: string; phone: string; email: string; state: string }> = {};
      if (body.name !== undefined) patch.name = body.name.trim();
      if (body.phone !== undefined) patch.phone = body.phone.trim();
      if (body.email !== undefined) patch.email = body.email.trim();
      if (body.state !== undefined) patch.state = body.state.trim();

      if (Object.keys(patch).length === 0) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Provide at least one of name, phone, email, state' },
        });
      }

      const [agency] = await db
        .update(agencies)
        .set(patch)
        .where(eq(agencies.id, req.user.agencyId as string))
        .returning({ id: agencies.id, name: agencies.name, phone: agencies.phone, email: agencies.email, state: agencies.state });

      return reply.send({ success: true, data: agency });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  /** Trip-credit wallet only (no monetary fields for agency owners). */
  fastify.get('/owner/wallet', { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const agencyId = req.user.agencyId as string;
      const [wallet] = await db
        .select({
          trips_remaining: agencyWallets.trips_remaining,
          trips_used_this_month: agencyWallets.trips_used_this_month,
        })
        .from(agencyWallets)
        .where(eq(agencyWallets.agency_id, agencyId))
        .limit(1);

      return reply.send({
        success: true,
        data: {
          trips_remaining: wallet?.trips_remaining ?? 0,
          trips_used_this_month: wallet?.trips_used_this_month ?? 0,
          rate_trips_per_completed_trip: 1,
        },
      });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.get('/owner/wallet/transactions', { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const page = Math.max(1, Number((req.query as { page?: string })?.page ?? 1));
      const pageSize = 50;
      const offset = (page - 1) * pageSize;

      const rows = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.agency_id, req.user.agencyId as string))
        .orderBy(desc(walletTransactions.created_at))
        .limit(pageSize)
        .offset(offset);

      const [countRow] = await db
        .select({ total: count() })
        .from(walletTransactions)
        .where(eq(walletTransactions.agency_id, req.user.agencyId as string));

      return reply.send({
        success: true,
        data: rows,
        meta: { page, page_size: pageSize, total: Number(countRow?.total ?? 0) },
      });
    } catch (err) {
      return handleError(reply, err);
    }
  });
}
