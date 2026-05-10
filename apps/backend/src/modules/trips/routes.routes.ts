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

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../auth/auth.middleware';
import { CreateRouteSchema, CreateStopSchema } from '../../lib/shared-types';
import * as RoutesService from './routes.service';
import { geocodePlace, reverseGeocodePlace } from './maps.service';

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

  const getStopId = (req: FastifyRequest): string =>
    (req.params as { stopId: string }).stopId;

  function handleErr(reply: FastifyReply, err: any) {
    return reply.status(err.statusCode ?? 500).send({
      success: false,
      error: { code: err.code ?? 'REQUEST_FAILED', message: err.message ?? 'An error occurred' },
    });
  }

  fastify.get('/search-place', async (req, reply) => {
    try {
      const q = ((req.query as { q?: string }).q ?? '').trim();
      if (!q) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Query parameter q is required' },
        });
      }
      const places = await geocodePlace(q);
      return reply.send({ success: true, data: places });
    } catch (err: any) {
      return handleErr(reply, err);
    }
  });

  fastify.get('/reverse-geocode', async (req, reply) => {
    try {
      const query = req.query as { lat?: string; lng?: string };
      const lat = Number(query.lat);
      const lng = Number(query.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'lat and lng are required' },
        });
      }
      const place = await reverseGeocodePlace(lat, lng);
      return reply.send({ success: true, data: place });
    } catch (err: any) {
      return handleErr(reply, err);
    }
  });

  // ── POST /api/routes ─────────────────────────────────────────────────────
  fastify.post('/', { preHandler: [requireAuth(['operator', 'owner', 'admin'])] },
    async (req, reply) => {
      try {
        const parsed = CreateRouteSchema.safeParse(req.body);
        if (!parsed.success) {
          return reply.status(400).send({ success: false, error: 'Validation failed', data: parsed.error.issues });
        }
        const agencyId = getAgencyIdOrReply(req, reply);
        if (!agencyId) return;
        const route = await RoutesService.createRoute(agencyId, parsed.data, req.user.id);
        return reply.status(201).send({
          success: true, data: route,
          meta: { timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
        });
      } catch (err: any) { return handleErr(reply, err); }
    }
  );

  // ── GET /api/routes ──────────────────────────────────────────────────────
  fastify.get('/', { preHandler: [requireAuth(['operator', 'owner', 'admin'])] },
    async (req, reply) => {
      try {
        const agencyId = getAgencyIdOrReply(req, reply);
        if (!agencyId) return;
        const routes = await RoutesService.listRoutes(agencyId);
        return reply.send({ success: true, data: routes, meta: { count: routes.length } });
      } catch (err: any) { return handleErr(reply, err); }
    }
  );

  // ── GET /api/routes/:routeId ─────────────────────────────────────────────
  fastify.get('/:routeId', { preHandler: [requireAuth(['operator', 'owner', 'admin'])] },
    async (req, reply) => {
      try {
        const agencyId = getAgencyIdOrReply(req, reply);
        if (!agencyId) return;
        const route = await RoutesService.getRoute(getRouteId(req), agencyId);
        return reply.send({ success: true, data: route });
      } catch (err: any) { return handleErr(reply, err); }
    }
  );

  // ── PUT /api/routes/:routeId ─────────────────────────────────────────────
  fastify.put('/:routeId', { preHandler: [requireAuth(['operator', 'owner', 'admin'])] },
    async (req, reply) => {
      try {
        const parsed = CreateRouteSchema.safeParse(req.body);
        if (!parsed.success) {
          return reply.status(400).send({ success: false, error: 'Validation failed', data: parsed.error.issues });
        }
        const agencyId = getAgencyIdOrReply(req, reply);
        if (!agencyId) return;
        const route = await RoutesService.updateRoute(getRouteId(req), agencyId, parsed.data);
        return reply.send({ success: true, data: route });
      } catch (err: any) { return handleErr(reply, err); }
    }
  );

  // ── DELETE /api/routes/:routeId ──────────────────────────────────────────
  fastify.delete('/:routeId', { preHandler: [requireAuth(['operator', 'owner', 'admin'])] },
    async (req, reply) => {
      try {
        const agencyId = getAgencyIdOrReply(req, reply);
        if (!agencyId) return;
        const result = await RoutesService.softDeleteRoute(getRouteId(req), agencyId);
        return reply.send({ success: true, data: result });
      } catch (err: any) { return handleErr(reply, err); }
    }
  );

  // ── POST /api/routes/:routeId/stops ─────────────────────────────────────
  fastify.post('/:routeId/stops', { preHandler: [requireAuth(['operator', 'owner', 'admin'])] },
    async (req, reply) => {
      try {
        const parsed = CreateStopSchema.safeParse(req.body);
        if (!parsed.success) {
          return reply.status(400).send({ success: false, error: 'Validation failed', data: parsed.error.issues });
        }
        const agencyId = getAgencyIdOrReply(req, reply);
        if (!agencyId) return;
        const stop = await RoutesService.addStop(getRouteId(req), agencyId, parsed.data);
        return reply.status(201).send({ success: true, data: stop });
      } catch (err: any) { return handleErr(reply, err); }
    }
  );

  // ── GET /api/routes/:routeId/stops ───────────────────────────────────────
  fastify.get('/:routeId/stops', { preHandler: [requireAuth(['operator', 'owner', 'admin'])] },
    async (req, reply) => {
      try {
        const agencyId = getAgencyIdOrReply(req, reply);
        if (!agencyId) return;
        const stopsData = await RoutesService.listStops(getRouteId(req), agencyId);
        return reply.send({ success: true, data: stopsData, meta: { count: stopsData.length } });
      } catch (err: any) { return handleErr(reply, err); }
    }
  );

  // ── PUT /api/routes/:routeId/stops/:stopId ───────────────────────────────
  fastify.put('/:routeId/stops/:stopId', { preHandler: [requireAuth(['operator', 'owner', 'admin'])] },
    async (req, reply) => {
      try {
        const agencyId = getAgencyIdOrReply(req, reply);
        if (!agencyId) return;
        const body = req.body as any;
        const payload = {
          name: body.name,
          sequence_number: body.sequence_number != null ? Number(body.sequence_number) : undefined,
          latitude: body.latitude != null ? Number(body.latitude) : undefined,
          longitude: body.longitude != null ? Number(body.longitude) : undefined,
          trigger_radius_km: body.trigger_radius_km != null ? Number(body.trigger_radius_km) : undefined,
        };
        const stop = await RoutesService.updateStop(getRouteId(req), getStopId(req), agencyId, payload);
        return reply.send({ success: true, data: stop });
      } catch (err: any) { return handleErr(reply, err); }
    }
  );

  // ── DELETE /api/routes/:routeId/stops/:stopId ────────────────────────────
  fastify.delete('/:routeId/stops/:stopId', { preHandler: [requireAuth(['operator', 'owner', 'admin'])] },
    async (req, reply) => {
      try {
        const agencyId = getAgencyIdOrReply(req, reply);
        if (!agencyId) return;
        const result = await RoutesService.deleteStop(getRouteId(req), getStopId(req), agencyId);
        return reply.send({ success: true, data: result });
      } catch (err: any) { return handleErr(reply, err); }
    }
  );
}
