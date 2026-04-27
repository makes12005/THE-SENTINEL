/**
 * Routes Module HTTP Layer
 * 
 * POST   /api/routes                    — create route (operator)
 * POST   /api/routes/:routeId/stops     — add stop   (operator)
 * GET    /api/routes                    — list routes (operator | owner)
 * GET    /api/routes/:routeId/stops     — list stops  (operator | owner)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../auth/auth.middleware';
import { CreateRouteSchema, CreateStopSchema } from '../../lib/shared-types';
import * as RoutesService from './routes.service';

export default async function routesRoutes(fastify: FastifyInstance) {
  const getAgencyIdOrReply = (req: FastifyRequest, reply: FastifyReply): string | null => {
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

  const getRouteId = (req: FastifyRequest): string =>
    (req.params as { routeId: string }).routeId;

  // ── POST /api/routes ──────────────────────────────────────────────────────
  fastify.post(
    '/',
    { preHandler: [requireAuth(['operator', 'admin'])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsed = CreateRouteSchema.safeParse(req.body);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false,
            error: 'Validation failed',
            data: parsed.error.issues,
          });
        }

        const agencyId = getAgencyIdOrReply(req, reply);
        if (!agencyId) return;
        const route = await RoutesService.createRoute(agencyId, parsed.data);

        return reply.status(201).send({
          success: true,
          data: route,
          meta: { timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
        });
      } catch (err: any) {
        return reply.status(err.statusCode ?? 500).send({
          success: false,
          error: err.message,
        });
      }
    }
  );

  // ── GET /api/routes ───────────────────────────────────────────────────────
  fastify.get(
    '/',
    { preHandler: [requireAuth(['operator', 'owner', 'admin'])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const agencyId = getAgencyIdOrReply(req, reply);
        if (!agencyId) return;
        const routes = await RoutesService.listRoutes(agencyId);

        return reply.send({
          success: true,
          data: routes,
          meta: {
            count: routes.length,
            timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          },
        });
      } catch (err: any) {
        return reply.status(err.statusCode ?? 500).send({
          success: false,
          error: err.message,
        });
      }
    }
  );

  // ── POST /api/routes/:routeId/stops ───────────────────────────────────────
  fastify.post(
    '/:routeId/stops',
    { preHandler: [requireAuth(['operator', 'admin'])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsed = CreateStopSchema.safeParse(req.body);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false,
            error: 'Validation failed',
            data: parsed.error.issues,
          });
        }

        const agencyId = getAgencyIdOrReply(req, reply);
        if (!agencyId) return;
        const stop = await RoutesService.addStop(
          getRouteId(req),
          agencyId,
          parsed.data
        );

        return reply.status(201).send({
          success: true,
          data: stop,
          meta: { timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
        });
      } catch (err: any) {
        return reply.status(err.statusCode ?? 500).send({
          success: false,
          error: err.message,
        });
      }
    }
  );

  // ── GET /api/routes/:routeId/stops ────────────────────────────────────────
  fastify.get(
    '/:routeId/stops',
    { preHandler: [requireAuth(['operator', 'owner', 'admin'])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const agencyId = getAgencyIdOrReply(req, reply);
        if (!agencyId) return;
        const stopsData = await RoutesService.listStops(getRouteId(req), agencyId);

        return reply.send({
          success: true,
          data: stopsData,
          meta: {
            count: stopsData.length,
            timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          },
        });
      } catch (err: any) {
        return reply.status(err.statusCode ?? 500).send({
          success: false,
          error: err.message,
        });
      }
    }
  );
}
