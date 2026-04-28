"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ownerRoutes;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const shared_types_1 = require("../../lib/shared-types");
const auth_middleware_1 = require("../auth/auth.middleware");
const orphan_service_1 = require("../operator/orphan.service");
function handleError(reply, err) {
    return reply.status(err.statusCode ?? 500).send({
        success: false,
        error: {
            code: err.code ?? 'REQUEST_FAILED',
            message: err.message ?? 'An error occurred',
        },
    });
}
function todayStart() {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
async function getAgencyOperatorIds(agencyId) {
    const rows = await db_1.db
        .select({ id: schema_1.users.id })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.users.role, 'operator')));
    return rows.map((row) => row.id);
}
async function ownerRoutes(fastify) {
    fastify.get('/owner/summary', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const agencyId = req.user.agencyId;
            const operatorIds = await getAgencyOperatorIds(agencyId);
            const dayStart = todayStart();
            const [operatorCount] = await db_1.db
                .select({ cnt: (0, drizzle_orm_1.count)() })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.users.role, 'operator')));
            const [wallet] = await db_1.db
                .select({
                trips_remaining: schema_1.agencyWallets.trips_remaining,
                trips_used_this_month: schema_1.agencyWallets.trips_used_this_month,
            })
                .from(schema_1.agencyWallets)
                .where((0, drizzle_orm_1.eq)(schema_1.agencyWallets.agency_id, agencyId))
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
            const [activeTrips] = await db_1.db
                .select({ cnt: (0, drizzle_orm_1.count)() })
                .from(schema_1.trips)
                .innerJoin(schema_1.routes, (0, drizzle_orm_1.eq)(schema_1.routes.id, schema_1.trips.route_id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.trips.status, 'active')));
            const todayTrips = await db_1.db
                .select({ id: schema_1.trips.id })
                .from(schema_1.trips)
                .innerJoin(schema_1.routes, (0, drizzle_orm_1.eq)(schema_1.routes.id, schema_1.trips.route_id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId), (0, drizzle_orm_1.gte)(schema_1.trips.created_at, dayStart)));
            const todayTripIds = todayTrips.map((trip) => trip.id);
            let totalPassengersToday = 0;
            let alertsSentToday = 0;
            let failedAlertsToday = 0;
            if (todayTripIds.length) {
                const [passengersRow] = await db_1.db
                    .select({ cnt: (0, drizzle_orm_1.count)() })
                    .from(schema_1.tripPassengers)
                    .where((0, drizzle_orm_1.inArray)(schema_1.tripPassengers.trip_id, todayTripIds));
                const [sentRow] = await db_1.db
                    .select({ cnt: (0, drizzle_orm_1.count)() })
                    .from(schema_1.tripPassengers)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.tripPassengers.trip_id, todayTripIds), (0, drizzle_orm_1.eq)(schema_1.tripPassengers.alert_status, 'sent')));
                const [failedRow] = await db_1.db
                    .select({ cnt: (0, drizzle_orm_1.count)() })
                    .from(schema_1.tripPassengers)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.tripPassengers.trip_id, todayTripIds), (0, drizzle_orm_1.eq)(schema_1.tripPassengers.alert_status, 'failed')));
                totalPassengersToday = Number(passengersRow?.cnt ?? 0);
                alertsSentToday = Number(sentRow?.cnt ?? 0);
                failedAlertsToday = Number(failedRow?.cnt ?? 0);
            }
            const [unassignedTrips] = await db_1.db
                .select({ cnt: (0, drizzle_orm_1.count)() })
                .from(schema_1.trips)
                .innerJoin(schema_1.routes, (0, drizzle_orm_1.eq)(schema_1.routes.id, schema_1.trips.route_id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.routes.agency_id, agencyId), (0, drizzle_orm_1.sql) `${schema_1.trips.assigned_operator_id} is null`, (0, drizzle_orm_1.sql) `${schema_1.trips.status} != 'completed'`));
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
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.get('/owner/operators', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const agencyId = req.user.agencyId;
            const operators = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.post('/owner/operators', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const agencyId = req.user.agencyId;
            const body = req.body ?? {};
            if (!body.name || !body.phone || !body.password) {
                return reply.status(400).send({ success: false, error: { code: 'MISSING_FIELDS', message: 'name, phone, and password are required' } });
            }
            const [existing] = await db_1.db.select({ id: schema_1.users.id }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.phone, body.phone)).limit(1);
            if (existing) {
                return reply.status(409).send({ success: false, error: { code: 'PHONE_TAKEN', message: 'A user with this phone already exists' } });
            }
            const passwordHash = await bcryptjs_1.default.hash(body.password, 12);
            const [operator] = await db_1.db
                .insert(schema_1.users)
                .values({
                agency_id: agencyId,
                name: body.name.trim(),
                phone: body.phone.trim(),
                password_hash: passwordHash,
                role: 'operator',
                is_active: true,
                added_by: req.user.id,
            })
                .returning({ id: schema_1.users.id, name: schema_1.users.name, phone: schema_1.users.phone, role: schema_1.users.role, is_active: schema_1.users.is_active, created_at: schema_1.users.created_at });
            return reply.status(201).send({ success: true, data: operator });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.post('/owner/operators/:id/toggle', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const agencyId = req.user.agencyId;
            const operatorId = req.params.id;
            const [target] = await db_1.db
                .select({ id: schema_1.users.id, is_active: schema_1.users.is_active })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, operatorId), (0, drizzle_orm_1.eq)(schema_1.users.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.users.role, 'operator')))
                .limit(1);
            if (!target) {
                return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Operator not found in your agency' } });
            }
            const nextStatus = !target.is_active;
            const [updated] = await db_1.db.update(schema_1.users).set({ is_active: nextStatus }).where((0, drizzle_orm_1.eq)(schema_1.users.id, operatorId)).returning({ id: schema_1.users.id, is_active: schema_1.users.is_active });
            if (!nextStatus) {
                await (0, orphan_service_1.handleOperatorDeactivation)(operatorId, agencyId, req.user.id);
            }
            return reply.send({ success: true, data: updated });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.get('/owner/trips', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const agencyId = req.user.agencyId;
            const query = req.query ?? {};
            const page = Math.max(1, Number(query.page ?? 1));
            const pageSize = 50;
            const offset = (page - 1) * pageSize;
            const whereParts = [
                (0, drizzle_orm_1.sql) `r.agency_id = ${agencyId}`,
                query.status ? (0, drizzle_orm_1.sql) `t.status = ${query.status}` : (0, drizzle_orm_1.sql) `true`,
                query.date ? (0, drizzle_orm_1.sql) `t.scheduled_date = ${query.date}` : (0, drizzle_orm_1.sql) `true`,
                query.unassigned === 'true' ? (0, drizzle_orm_1.sql) `t.assigned_to_operator_id is null` : (0, drizzle_orm_1.sql) `true`,
            ];
            const rows = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
          r.name as route_name,
          r.from_city,
          r.to_city,
          count(tp.id)::text as passenger_count
        from trips t
        inner join routes r on r.id = t.route_id
        left join users owner_user on owner_user.id = t.operator_id
        left join users assigned_user on assigned_user.id = t.assigned_to_operator_id
        left join trip_passengers tp on tp.trip_id = t.id
        where ${drizzle_orm_1.sql.join(whereParts, (0, drizzle_orm_1.sql) ` and `)}
        group by t.id, r.id, owner_user.name, assigned_user.name
        order by t.created_at desc
        limit ${pageSize} offset ${offset}
      `);
            const [countRow] = await db_1.db.execute((0, drizzle_orm_1.sql) `
        select count(*)::text as total
        from trips t
        inner join routes r on r.id = t.route_id
        where ${drizzle_orm_1.sql.join(whereParts, (0, drizzle_orm_1.sql) ` and `)}
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
                    route: {
                        name: row.route_name,
                        from_city: row.from_city,
                        to_city: row.to_city,
                    },
                    passenger_count: Number(row.passenger_count ?? 0),
                })),
                meta: {
                    page,
                    page_size: pageSize,
                    total: Number(countRow?.total ?? 0),
                },
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.get('/owner/logs', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const agencyId = req.user.agencyId;
            const query = req.query ?? {};
            const page = Math.max(1, Number(query.page ?? 1));
            const pageSize = 50;
            const offset = (page - 1) * pageSize;
            const whereParts = [
                (0, drizzle_orm_1.sql) `r.agency_id = ${agencyId}`,
                query.channel ? (0, drizzle_orm_1.sql) `al.channel = ${query.channel}` : (0, drizzle_orm_1.sql) `true`,
                query.status ? (0, drizzle_orm_1.sql) `al.status = ${query.status}` : (0, drizzle_orm_1.sql) `true`,
            ];
            const rows = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        where ${drizzle_orm_1.sql.join(whereParts, (0, drizzle_orm_1.sql) ` and `)}
        order by al.attempted_at desc
        limit ${pageSize} offset ${offset}
      `);
            const [countRow] = await db_1.db.execute((0, drizzle_orm_1.sql) `
        select count(*)::text as total
        from alert_logs al
        inner join trip_passengers tp on tp.id = al.trip_passenger_id
        inner join trips t on t.id = tp.trip_id
        inner join routes r on r.id = t.route_id
        where ${drizzle_orm_1.sql.join(whereParts, (0, drizzle_orm_1.sql) ` and `)}
      `);
            return reply.send({
                success: true,
                data: rows.map((row) => ({ ...row, operator_name: row.owner_name })),
                meta: { page, page_size: pageSize, total: Number(countRow?.total ?? 0) },
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.get('/agency/profile', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OWNER, shared_types_1.UserRole.OPERATOR, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const [agency] = await db_1.db
                .select({ id: schema_1.agencies.id, name: schema_1.agencies.name, phone: schema_1.agencies.phone, email: schema_1.agencies.email, state: schema_1.agencies.state })
                .from(schema_1.agencies)
                .where((0, drizzle_orm_1.eq)(schema_1.agencies.id, req.user.agencyId))
                .limit(1);
            if (!agency) {
                return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Agency not found' } });
            }
            return reply.send({ success: true, data: agency });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.put('/agency/profile', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const body = req.body ?? {};
            const [agency] = await db_1.db
                .update(schema_1.agencies)
                .set({
                name: body.name?.trim(),
                phone: body.phone?.trim(),
                email: body.email?.trim(),
                state: body.state?.trim(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.agencies.id, req.user.agencyId))
                .returning({ id: schema_1.agencies.id, name: schema_1.agencies.name, phone: schema_1.agencies.phone, email: schema_1.agencies.email, state: schema_1.agencies.state });
            return reply.send({ success: true, data: agency });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.get('/owner/wallet/transactions', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const page = Math.max(1, Number(req.query?.page ?? 1));
            const pageSize = 50;
            const offset = (page - 1) * pageSize;
            const rows = await db_1.db
                .select()
                .from(schema_1.walletTransactions)
                .where((0, drizzle_orm_1.eq)(schema_1.walletTransactions.agency_id, req.user.agencyId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.walletTransactions.created_at))
                .limit(pageSize)
                .offset(offset);
            const [countRow] = await db_1.db
                .select({ total: (0, drizzle_orm_1.count)() })
                .from(schema_1.walletTransactions)
                .where((0, drizzle_orm_1.eq)(schema_1.walletTransactions.agency_id, req.user.agencyId));
            return reply.send({
                success: true,
                data: rows,
                meta: { page, page_size: pageSize, total: Number(countRow?.total ?? 0) },
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
}
