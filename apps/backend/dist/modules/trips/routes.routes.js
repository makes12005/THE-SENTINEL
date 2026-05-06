"use strict";
/**
 * Routes Module HTTP Layer
 *
 * POST   /api/routes                          — create route
 * GET    /api/routes                          — list routes (with stop count)
 * GET    /api/routes/:routeId                 — get single route with stops
 * PUT    /api/routes/:routeId                 — update route
 * DELETE /api/routes/:routeId                 — soft delete route
 * POST   /api/routes/:routeId/stops           — add stop
 * GET    /api/routes/:routeId/stops           — list stops (with lat/lng)
 * PUT    /api/routes/:routeId/stops/:stopId   — update stop
 * DELETE /api/routes/:routeId/stops/:stopId   — delete stop
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = routesRoutes;
const auth_middleware_1 = require("../auth/auth.middleware");
const shared_types_1 = require("../../lib/shared-types");
const RoutesService = __importStar(require("./routes.service"));
async function routesRoutes(fastify) {
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
    const getRouteId = (req) => req.params.routeId;
    const getStopId = (req) => req.params.stopId;
    function handleErr(reply, err) {
        return reply.status(err.statusCode ?? 500).send({
            success: false,
            error: { code: err.code ?? 'REQUEST_FAILED', message: err.message ?? 'An error occurred' },
        });
    }
    // ── POST /api/routes ─────────────────────────────────────────────────────
    fastify.post('/', { preHandler: [(0, auth_middleware_1.requireAuth)(['operator', 'owner', 'admin'])] }, async (req, reply) => {
        try {
            const parsed = shared_types_1.CreateRouteSchema.safeParse(req.body);
            if (!parsed.success) {
                return reply.status(400).send({ success: false, error: 'Validation failed', data: parsed.error.issues });
            }
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const route = await RoutesService.createRoute(agencyId, parsed.data, req.user.id);
            return reply.status(201).send({
                success: true, data: route,
                meta: { timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
            });
        }
        catch (err) {
            return handleErr(reply, err);
        }
    });
    // ── GET /api/routes ──────────────────────────────────────────────────────
    fastify.get('/', { preHandler: [(0, auth_middleware_1.requireAuth)(['operator', 'owner', 'admin'])] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const routes = await RoutesService.listRoutes(agencyId);
            return reply.send({ success: true, data: routes, meta: { count: routes.length } });
        }
        catch (err) {
            return handleErr(reply, err);
        }
    });
    // ── GET /api/routes/:routeId ─────────────────────────────────────────────
    fastify.get('/:routeId', { preHandler: [(0, auth_middleware_1.requireAuth)(['operator', 'owner', 'admin'])] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const route = await RoutesService.getRoute(getRouteId(req), agencyId);
            return reply.send({ success: true, data: route });
        }
        catch (err) {
            return handleErr(reply, err);
        }
    });
    // ── PUT /api/routes/:routeId ─────────────────────────────────────────────
    fastify.put('/:routeId', { preHandler: [(0, auth_middleware_1.requireAuth)(['operator', 'owner', 'admin'])] }, async (req, reply) => {
        try {
            const parsed = shared_types_1.CreateRouteSchema.safeParse(req.body);
            if (!parsed.success) {
                return reply.status(400).send({ success: false, error: 'Validation failed', data: parsed.error.issues });
            }
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const route = await RoutesService.updateRoute(getRouteId(req), agencyId, parsed.data);
            return reply.send({ success: true, data: route });
        }
        catch (err) {
            return handleErr(reply, err);
        }
    });
    // ── DELETE /api/routes/:routeId ──────────────────────────────────────────
    fastify.delete('/:routeId', { preHandler: [(0, auth_middleware_1.requireAuth)(['operator', 'owner', 'admin'])] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const result = await RoutesService.softDeleteRoute(getRouteId(req), agencyId);
            return reply.send({ success: true, data: result });
        }
        catch (err) {
            return handleErr(reply, err);
        }
    });
    // ── POST /api/routes/:routeId/stops ─────────────────────────────────────
    fastify.post('/:routeId/stops', { preHandler: [(0, auth_middleware_1.requireAuth)(['operator', 'owner', 'admin'])] }, async (req, reply) => {
        try {
            const parsed = shared_types_1.CreateStopSchema.safeParse(req.body);
            if (!parsed.success) {
                return reply.status(400).send({ success: false, error: 'Validation failed', data: parsed.error.issues });
            }
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const stop = await RoutesService.addStop(getRouteId(req), agencyId, parsed.data);
            return reply.status(201).send({ success: true, data: stop });
        }
        catch (err) {
            return handleErr(reply, err);
        }
    });
    // ── GET /api/routes/:routeId/stops ───────────────────────────────────────
    fastify.get('/:routeId/stops', { preHandler: [(0, auth_middleware_1.requireAuth)(['operator', 'owner', 'admin'])] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const stopsData = await RoutesService.listStops(getRouteId(req), agencyId);
            return reply.send({ success: true, data: stopsData, meta: { count: stopsData.length } });
        }
        catch (err) {
            return handleErr(reply, err);
        }
    });
    // ── PUT /api/routes/:routeId/stops/:stopId ───────────────────────────────
    fastify.put('/:routeId/stops/:stopId', { preHandler: [(0, auth_middleware_1.requireAuth)(['operator', 'owner', 'admin'])] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const body = req.body;
            const payload = {
                name: body.name,
                sequence_number: body.sequence_number != null ? Number(body.sequence_number) : undefined,
                latitude: body.latitude != null ? Number(body.latitude) : undefined,
                longitude: body.longitude != null ? Number(body.longitude) : undefined,
                trigger_radius_km: body.trigger_radius_km != null ? Number(body.trigger_radius_km) : undefined,
            };
            const stop = await RoutesService.updateStop(getRouteId(req), getStopId(req), agencyId, payload);
            return reply.send({ success: true, data: stop });
        }
        catch (err) {
            return handleErr(reply, err);
        }
    });
    // ── DELETE /api/routes/:routeId/stops/:stopId ────────────────────────────
    fastify.delete('/:routeId/stops/:stopId', { preHandler: [(0, auth_middleware_1.requireAuth)(['operator', 'owner', 'admin'])] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const result = await RoutesService.deleteStop(getRouteId(req), getStopId(req), agencyId);
            return reply.send({ success: true, data: result });
        }
        catch (err) {
            return handleErr(reply, err);
        }
    });
}
