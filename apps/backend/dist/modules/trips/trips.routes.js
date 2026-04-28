"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = tripsRoutes;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const socket_1 = require("../../lib/socket");
const shared_types_1 = require("../../lib/shared-types");
const auth_middleware_1 = require("../auth/auth.middleware");
const trip_auth_helper_1 = require("./trip-auth.helper");
const geo_service_1 = require("./geo.service");
const location_service_1 = require("./location.service");
const passengers_service_1 = require("./passengers.service");
const takeover_service_1 = require("./takeover.service");
const trips_service_1 = require("./trips.service");
function handleError(reply, err) {
    const body = {
        success: false,
        error: {
            code: err.code ?? 'REQUEST_FAILED',
            message: err.message ?? 'An error occurred',
        },
    };
    if (err.rowErrors)
        body.row_errors = err.rowErrors;
    return reply.status(err.statusCode ?? 500).send(body);
}
async function tripsRoutes(fastify) {
    const getTripId = (req) => req.params.id;
    const getAgencyIdOrReply = (req, reply) => {
        const agencyId = req.user.agency_id ?? req.user.agencyId ?? null;
        if (!agencyId) {
            reply.status(400).send({
                success: false,
                error: { code: 'AGENCY_REQUIRED', message: 'User has no agency assigned' },
            });
            return null;
        }
        return agencyId;
    };
    fastify.post('/', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OPERATOR, shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        const parsed = shared_types_1.CreateTripSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide valid trip details' } });
        }
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const trip = await trips_service_1.TripsService.createTrip(req.user.id, agencyId, parsed.data);
            return reply.status(201).send({ success: true, data: trip });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.get('/', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OPERATOR, shared_types_1.UserRole.OWNER, shared_types_1.UserRole.DRIVER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        const parsed = shared_types_1.ListTripsQuerySchema.safeParse(req.query ?? {});
        if (!parsed.success) {
            return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid trip filters' } });
        }
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const data = await trips_service_1.TripsService.listTrips(agencyId, req.user.id, req.user.role, parsed.data);
            return reply.send({ success: true, data, meta: { count: data.length, timestamp: new Date().toISOString() } });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.get('/:id', { preHandler: [(0, auth_middleware_1.requireAuth)()] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            await (0, trip_auth_helper_1.verifyTripAgency)(getTripId(req), agencyId, req.user.id, req.user.role);
            const trip = await trips_service_1.TripsService.getTrip(getTripId(req));
            return reply.send({ success: true, data: trip });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.get('/:id/status', { preHandler: [(0, auth_middleware_1.requireAuth)()] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            await (0, trip_auth_helper_1.verifyTripAgency)(getTripId(req), agencyId, req.user.id, req.user.role);
            const status = await trips_service_1.TripsService.getTripStatus(getTripId(req));
            return reply.send({ success: true, data: status });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.get('/:id/passengers', { preHandler: [(0, auth_middleware_1.requireAuth)()] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            await (0, trip_auth_helper_1.verifyTripAgency)(getTripId(req), agencyId, req.user.id, req.user.role);
            const passengers = await trips_service_1.TripsService.listPassengers(getTripId(req));
            return reply.send({ success: true, data: passengers, meta: { count: passengers.length, timestamp: new Date().toISOString() } });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.put('/:id/start', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.CONDUCTOR])] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            await (0, trip_auth_helper_1.verifyTripAgency)(getTripId(req), agencyId, req.user.id, req.user.role);
            const trip = await trips_service_1.TripsService.startTrip(getTripId(req), req.user.id);
            return reply.send({ success: true, data: trip });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.put('/:id/complete', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.CONDUCTOR])] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            await (0, trip_auth_helper_1.verifyTripAgency)(getTripId(req), agencyId, req.user.id, req.user.role);
            const trip = await trips_service_1.TripsService.completeTrip(getTripId(req), req.user.id);
            return reply.send({ success: true, data: trip });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.post('/:id/location', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.CONDUCTOR])] }, async (req, reply) => {
        const parsed = shared_types_1.LocationUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid GPS update' } });
        }
        try {
            const tripId = getTripId(req);
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            await (0, trip_auth_helper_1.verifyTripAgency)(tripId, agencyId, req.user.id, req.user.role);
            await location_service_1.LocationService.assertConductorOwnsActiveTrip(tripId, req.user.id);
            const locationId = await location_service_1.LocationService.save(tripId, req.user.id, parsed.data);
            geo_service_1.GeoService.checkStopProximity(tripId, parsed.data.lat, parsed.data.lng).catch((error) => {
                fastify.log.error({ error }, '[Geo] proximity check failed');
            });
            return reply.status(202).send({ success: true, data: { location_id: locationId } });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.get('/:id/location', { preHandler: [(0, auth_middleware_1.requireAuth)()] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            await (0, trip_auth_helper_1.verifyTripAgency)(getTripId(req), agencyId, req.user.id, req.user.role);
            const location = await trips_service_1.TripsService.getCurrentLocation(getTripId(req));
            if (!location) {
                return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'No location data for this trip yet' } });
            }
            return reply.send({ success: true, data: location });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.post('/:id/passengers', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OPERATOR, shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        const parsed = shared_types_1.AddPassengerSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide valid passenger details' } });
        }
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            await (0, trip_auth_helper_1.verifyTripAgency)(getTripId(req), agencyId, req.user.id, req.user.role);
            const passenger = await trips_service_1.TripsService.addPassenger(getTripId(req), parsed.data);
            return reply.status(201).send({ success: true, data: passenger });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.post('/:id/passengers/upload', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OPERATOR, shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            await (0, trip_auth_helper_1.verifyTripAgency)(getTripId(req), agencyId, req.user.id, req.user.role);
            const data = await req.file();
            if (!data) {
                return reply.status(400).send({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded. Use multipart/form-data with field name \"file\"' } });
            }
            const chunks = [];
            for await (const chunk of data.file)
                chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            const result = await (0, passengers_service_1.uploadPassengers)(getTripId(req), agencyId, buffer, data.mimetype, data.filename);
            return reply.status(201).send({ success: true, data: result });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.put('/:id/takeover', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.DRIVER])] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            await (0, trip_auth_helper_1.verifyTripAgency)(getTripId(req), agencyId, req.user.id, req.user.role);
            const result = await takeover_service_1.TakeoverService.takeoverTrip(getTripId(req), req.user.id, fastify);
            return reply.send({ success: true, data: result });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    const reassignHandler = async (req, reply) => {
        const parsed = shared_types_1.AssignTripSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please select a valid operator to reassign this trip' } });
        }
        try {
            const tripId = getTripId(req);
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            await (0, trip_auth_helper_1.verifyTripAgency)(tripId, agencyId, req.user.id, req.user.role);
            const [trip] = await db_1.db
                .select({
                id: schema_1.trips.id,
                status: schema_1.trips.status,
                owned_by_operator_id: schema_1.trips.owned_by_operator_id,
                route_name: schema_1.routes.name,
            })
                .from(schema_1.trips)
                .innerJoin(schema_1.routes, (0, drizzle_orm_1.eq)(schema_1.routes.id, schema_1.trips.route_id))
                .where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId))
                .limit(1);
            if (!trip) {
                return reply.status(404).send({ success: false, error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' } });
            }
            if (req.user.role === shared_types_1.UserRole.OPERATOR && trip.owned_by_operator_id !== req.user.id) {
                return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Only the trip owner can reassign this trip' } });
            }
            const [targetOperator] = await db_1.db
                .select({ id: schema_1.users.id, name: schema_1.users.name, agency_id: schema_1.users.agency_id, role: schema_1.users.role, is_active: schema_1.users.is_active })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, parsed.data.assigned_operator_id))
                .limit(1);
            if (!targetOperator || targetOperator.agency_id !== agencyId || targetOperator.role !== 'operator') {
                return reply.status(422).send({ success: false, error: { code: 'INVALID_OPERATOR', message: 'Selected operator does not belong to your agency' } });
            }
            if (!targetOperator.is_active) {
                return reply.status(422).send({ success: false, error: { code: 'OPERATOR_INACTIVE', message: 'Selected operator is inactive' } });
            }
            const [updated] = await db_1.db
                .update(schema_1.trips)
                .set({ assigned_operator_id: parsed.data.assigned_operator_id })
                .where((0, drizzle_orm_1.eq)(schema_1.trips.id, tripId))
                .returning();
            await db_1.db.insert(schema_1.auditLogs).values({
                user_id: req.user.id,
                action: 'TRIP_REASSIGNED',
                entity_type: 'trip',
                entity_id: tripId,
                metadata: {
                    assigned_operator_id: parsed.data.assigned_operator_id,
                    assigned_by: req.user.name ?? req.user.id,
                },
            });
            await (0, socket_1.emitSocketEvent)(`user:${parsed.data.assigned_operator_id}`, 'trip_assigned', {
                tripId,
                tripName: trip.route_name,
                assignedBy: req.user.name ?? 'Agency owner',
            });
            return reply.send({ success: true, data: updated });
        }
        catch (err) {
            return handleError(reply, err);
        }
    };
    fastify.put('/:id/reassign', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OPERATOR, shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, reassignHandler);
    fastify.post('/:id/assign', { preHandler: [(0, auth_middleware_1.requireAuth)([shared_types_1.UserRole.OPERATOR, shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN])] }, reassignHandler);
}
