"use strict";
/**
 * Operator Module Routes — Sprint 7
 *
 * GET  /api/operator/summary     — dashboard summary (operator | owner)
 * POST /api/agency/members       — add conductor or driver (operator)
 * GET  /api/agency/members       — list conductors + drivers (operator | owner)
 * GET  /api/logs/alerts          — paginated alert logs (operator | owner)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = operatorRoutes;
const auth_middleware_1 = require("../auth/auth.middleware");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const shared_types_1 = require("../../lib/shared-types");
function handleError(reply, err) {
    const status = err.statusCode ?? 500;
    return reply.status(status).send({
        success: false,
        error: { code: 'REQUEST_FAILED', message: err.message ?? 'An error occurred' },
    });
}
// ── Midnight of today in UTC ────────────────────────────────────────────────
function todayStart() {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
async function operatorRoutes(fastify) {
    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/operator/summary
    // Returns: active_trips, total_passengers_today, alerts_sent_today,
    //          failed_alerts_today
    // ─────────────────────────────────────────────────────────────────────────
    fastify.get('/operator/summary', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OPERATOR, shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const user = req.user;
            const agencyId = user.agencyId;
            const dayStart = todayStart();
            // Active trips for this agency
            const [activeRow] = await db_1.db
                .select({ active_trips: (0, drizzle_orm_1.count)() })
                .from(schema_1.trips)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.trips.status, 'active'), 
            // trips belong to agency via operator_id
            (0, drizzle_orm_1.inArray)(schema_1.trips.owned_by_operator_id, db_1.db.select({ id: schema_1.users.id }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.agency_id, agencyId)))));
            // Today's trips for this agency
            const todayTrips = await db_1.db
                .select({ id: schema_1.trips.id })
                .from(schema_1.trips)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.trips.created_at, dayStart), (0, drizzle_orm_1.inArray)(schema_1.trips.owned_by_operator_id, db_1.db.select({ id: schema_1.users.id }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.agency_id, agencyId)))));
            const todayTripIds = todayTrips.map((t) => t.id);
            let totalPassengersToday = 0;
            let alertsSentToday = 0;
            let failedAlertsToday = 0;
            if (todayTripIds.length > 0) {
                const [passRow] = await db_1.db
                    .select({ cnt: (0, drizzle_orm_1.count)() })
                    .from(schema_1.tripPassengers)
                    .where((0, drizzle_orm_1.inArray)(schema_1.tripPassengers.trip_id, todayTripIds));
                totalPassengersToday = Number(passRow?.cnt ?? 0);
                const [sentRow] = await db_1.db
                    .select({ cnt: (0, drizzle_orm_1.count)() })
                    .from(schema_1.tripPassengers)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.tripPassengers.trip_id, todayTripIds), (0, drizzle_orm_1.eq)(schema_1.tripPassengers.alert_status, 'sent')));
                alertsSentToday = Number(sentRow?.cnt ?? 0);
                const [failRow] = await db_1.db
                    .select({ cnt: (0, drizzle_orm_1.count)() })
                    .from(schema_1.tripPassengers)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.tripPassengers.trip_id, todayTripIds), (0, drizzle_orm_1.eq)(schema_1.tripPassengers.alert_status, 'failed')));
                failedAlertsToday = Number(failRow?.cnt ?? 0);
            }
            return reply.send({
                success: true,
                data: {
                    active_trips: Number(activeRow?.active_trips ?? 0),
                    total_passengers_today: totalPassengersToday,
                    alerts_sent_today: alertsSentToday,
                    failed_alerts_today: failedAlertsToday,
                },
                meta: { timestamp: new Date().toISOString() },
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/operator/trips
    // Returns trips visible to operator's agency.
    // ─────────────────────────────────────────────────────────────────────────
    fastify.get('/operator/trips', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OPERATOR, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const user = req.user;
            const agencyId = user.agencyId;
            const query = req.query ?? {};
            const conditions = [
                (0, drizzle_orm_1.inArray)(schema_1.trips.owned_by_operator_id, db_1.db.select({ id: schema_1.users.id }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.agency_id, agencyId))),
            ];
            if (query.status) {
                conditions.push((0, drizzle_orm_1.eq)(schema_1.trips.status, query.status));
            }
            const rows = await db_1.db
                .select({
                id: schema_1.trips.id,
                route_id: schema_1.trips.route_id,
                operator_id: schema_1.trips.owned_by_operator_id,
                conductor_id: schema_1.trips.conductor_id,
                driver_id: schema_1.trips.driver_id,
                status: schema_1.trips.status,
                scheduled_date: schema_1.trips.scheduled_date,
                started_at: schema_1.trips.started_at,
                completed_at: schema_1.trips.completed_at,
                created_at: schema_1.trips.created_at,
            })
                .from(schema_1.trips)
                .where((0, drizzle_orm_1.and)(...conditions))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.trips.created_at));
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
    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/logs/alerts
    // Query: ?date=YYYY-MM-DD&channel=call|sms|whatsapp|manual&status=success|failed
    //        &page=1 (50 per page)
    // Returns paginated alertLogs for this agency's trips
    // ─────────────────────────────────────────────────────────────────────────
    fastify.get('/logs/alert-logs', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OPERATOR, shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const user = req.user;
            const agencyId = user.agencyId;
            const query = req.query ?? {};
            const PAGE_SIZE = 50;
            const page = Math.max(1, parseInt(query.page ?? '1', 10));
            const offset = (page - 1) * PAGE_SIZE;
            // Build filter list step-by-step
            // 1. Get agency trip IDs
            const agencyTrips = await db_1.db
                .select({ id: schema_1.trips.id })
                .from(schema_1.trips)
                .where((0, drizzle_orm_1.inArray)(schema_1.trips.owned_by_operator_id, db_1.db.select({ id: schema_1.users.id }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.agency_id, agencyId))));
            const tripIds = agencyTrips.map((t) => t.id);
            if (tripIds.length === 0) {
                return reply.send({ success: true, data: [], meta: { page, page_size: PAGE_SIZE, total: 0 } });
            }
            // 2. Get passenger IDs in those trips (optionally filtered by date)
            let passQuery = db_1.db
                .select({ id: schema_1.tripPassengers.id })
                .from(schema_1.tripPassengers)
                .where((0, drizzle_orm_1.inArray)(schema_1.tripPassengers.trip_id, tripIds));
            const passengerRows = await passQuery;
            const passengerIds = passengerRows.map((p) => p.id);
            if (passengerIds.length === 0) {
                return reply.send({ success: true, data: [], meta: { page, page_size: PAGE_SIZE, total: 0 } });
            }
            // 3. Build alertLogs filter conditions
            const conditions = [
                (0, drizzle_orm_1.inArray)(schema_1.alertLogs.trip_passenger_id, passengerIds),
            ];
            if (query.channel)
                conditions.push((0, drizzle_orm_1.eq)(schema_1.alertLogs.channel, query.channel));
            if (query.status)
                conditions.push((0, drizzle_orm_1.eq)(schema_1.alertLogs.status, query.status));
            if (query.date) {
                const start = new Date(query.date);
                start.setUTCHours(0, 0, 0, 0);
                const end = new Date(start);
                end.setUTCDate(end.getUTCDate() + 1);
                conditions.push((0, drizzle_orm_1.gte)(schema_1.alertLogs.attempted_at, start));
            }
            // 4. Count + paginated fetch
            const [countRow] = await db_1.db
                .select({ total: (0, drizzle_orm_1.count)() })
                .from(schema_1.alertLogs)
                .where((0, drizzle_orm_1.and)(...conditions));
            const logs = await db_1.db
                .select({
                id: schema_1.alertLogs.id,
                channel: schema_1.alertLogs.channel,
                status: schema_1.alertLogs.status,
                attempted_at: schema_1.alertLogs.attempted_at,
                response_code: schema_1.alertLogs.response_code,
                error_message: schema_1.alertLogs.error_message,
                // join passenger info
                passenger_name: schema_1.tripPassengers.passenger_name,
                passenger_phone: schema_1.tripPassengers.passenger_phone,
                trip_id: schema_1.tripPassengers.trip_id,
            })
                .from(schema_1.alertLogs)
                .innerJoin(schema_1.tripPassengers, (0, drizzle_orm_1.eq)(schema_1.alertLogs.trip_passenger_id, schema_1.tripPassengers.id))
                .where((0, drizzle_orm_1.and)(...conditions))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.alertLogs.attempted_at))
                .limit(PAGE_SIZE)
                .offset(offset);
            return reply.send({
                success: true,
                data: logs,
                meta: {
                    page,
                    page_size: PAGE_SIZE,
                    total: Number(countRow?.total ?? 0),
                    timestamp: new Date().toISOString(),
                },
            });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
}
