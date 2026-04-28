"use strict";
/**
 * Routes Module HTTP Layer
 *
 * POST   /api/routes                    — create route (operator)
 * POST   /api/routes/:routeId/stops     — add stop   (operator)
 * GET    /api/routes                    — list routes (operator | owner)
 * GET    /api/routes/:routeId/stops     — list stops  (operator | owner)
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
    // ── POST /api/routes ──────────────────────────────────────────────────────
    fastify.post('/', { preHandler: [(0, auth_middleware_1.requireAuth)(['operator', 'admin'])] }, async (req, reply) => {
        try {
            const parsed = shared_types_1.CreateRouteSchema.safeParse(req.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: 'Validation failed',
                    data: parsed.error.issues,
                });
            }
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const route = await RoutesService.createRoute(agencyId, parsed.data);
            return reply.status(201).send({
                success: true,
                data: route,
                meta: { timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
            });
        }
        catch (err) {
            return reply.status(err.statusCode ?? 500).send({
                success: false,
                error: err.message,
            });
        }
    });
    // ── GET /api/routes ───────────────────────────────────────────────────────
    fastify.get('/', { preHandler: [(0, auth_middleware_1.requireAuth)(['operator', 'owner', 'admin'])] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const routes = await RoutesService.listRoutes(agencyId);
            return reply.send({
                success: true,
                data: routes,
                meta: {
                    count: routes.length,
                    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                },
            });
        }
        catch (err) {
            return reply.status(err.statusCode ?? 500).send({
                success: false,
                error: err.message,
            });
        }
    });
    // ── POST /api/routes/:routeId/stops ───────────────────────────────────────
    fastify.post('/:routeId/stops', { preHandler: [(0, auth_middleware_1.requireAuth)(['operator', 'admin'])] }, async (req, reply) => {
        try {
            const parsed = shared_types_1.CreateStopSchema.safeParse(req.body);
            if (!parsed.success) {
                return reply.status(400).send({
                    success: false,
                    error: 'Validation failed',
                    data: parsed.error.issues,
                });
            }
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const stop = await RoutesService.addStop(getRouteId(req), agencyId, parsed.data);
            return reply.status(201).send({
                success: true,
                data: stop,
                meta: { timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
            });
        }
        catch (err) {
            return reply.status(err.statusCode ?? 500).send({
                success: false,
                error: err.message,
            });
        }
    });
    // ── GET /api/routes/:routeId/stops ────────────────────────────────────────
    fastify.get('/:routeId/stops', { preHandler: [(0, auth_middleware_1.requireAuth)(['operator', 'owner', 'admin'])] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const stopsData = await RoutesService.listStops(getRouteId(req), agencyId);
            return reply.send({
                success: true,
                data: stopsData,
                meta: {
                    count: stopsData.length,
                    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                },
            });
        }
        catch (err) {
            return reply.status(err.statusCode ?? 500).send({
                success: false,
                error: err.message,
            });
        }
    });
}
