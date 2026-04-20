/**
 * Trips Module HTTP Layer
 *
 * Existing routes (Sprint 2):
 *   POST   /api/trips                      — create trip (operator)
 *   GET    /api/trips/:id                  — trip details (any auth)
 *   PUT    /api/trips/:id/start            — start trip (conductor)
 *   PUT    /api/trips/:id/complete         — complete trip (conductor)
 *   POST   /api/trips/:id/location         — GPS ping (conductor)
 *   GET    /api/trips/:id/location         — current location (any auth)
 *   POST   /api/trips/:id/passengers       — add passenger (operator)
 *
 * New routes (Sprint 4):
 *   GET    /api/trips                      — list trips (operator | owner | driver)
 *   GET    /api/trips/:id/status           — status + location + summary (operator | owner | conductor | driver)
 *   GET    /api/trips/:id/passengers       — passenger list with alert_status (operator | conductor | driver)
 *   POST   /api/trips/:id/passengers/upload — CSV/xlsx bulk upload (operator)
 *
 * New routes (Sprint 6):
 *   PUT    /api/trips/:id/takeover         — driver takes over conductor role
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../auth/auth.middleware';
import { TripsService } from './trips.service';
import { LocationService } from './location.service';
import { GeoService } from './geo.service';
import { TakeoverService } from './takeover.service';
import { uploadPassengers } from './passengers.service';
import {
  UserRole,
  CreateTripSchema,
  LocationUpdateSchema,
  AddPassengerSchema,
  ListTripsQuerySchema,
} from '@busalert/shared-types';

function handleError(reply: FastifyReply, err: any) {
  const status = (err as any).statusCode ?? 500;
  const body: Record<string, unknown> = {
    success: false,
    error: { code: 'REQUEST_FAILED', message: err.message ?? 'An error occurred' },
  };
  // Attach row-by-row errors for upload failures
  if (err.rowErrors) body.row_errors = err.rowErrors;
  return reply.status(status).send(body);
}

export default async function tripsRoutes(fastify: FastifyInstance) {

  // ─────────────────────────────────────────────────────────────────
  // Sprint 2 — existing routes
  // ─────────────────────────────────────────────────────────────────

  // POST /trips — create trip (operator | admin)
  fastify.post(
    '/',
    { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = CreateTripSchema.safeParse(req.body);
      if (!parsed.success)
        return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.format() } });

      try {
        const user: any = (req as any).user;
        const trip = await TripsService.createTrip(user.id, user.agencyId, parsed.data);
        return reply.status(201).send({ success: true, data: trip });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // GET /trips/:id — trip details + passengers (any authenticated role)
  fastify.get(
    '/:id',
    { preHandler: [requireAuth()] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const trip = await TripsService.getTrip(req.params.id);
        return reply.send({ success: true, data: trip });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // PUT /trips/:id/start — start trip (conductor only)
  fastify.put(
    '/:id/start',
    { preHandler: [requireAuth([UserRole.CONDUCTOR])] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const user: any = (req as any).user;
        const trip = await TripsService.startTrip(req.params.id, user.id);
        return reply.send({ success: true, data: trip });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // PUT /trips/:id/complete — complete trip (conductor only)
  fastify.put(
    '/:id/complete',
    { preHandler: [requireAuth([UserRole.CONDUCTOR])] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const user: any = (req as any).user;
        const trip = await TripsService.completeTrip(req.params.id, user.id);
        return reply.send({ success: true, data: trip });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // POST /trips/:id/location — conductor GPS ping (conductor only)
  fastify.post(
    '/:id/location',
    { preHandler: [requireAuth([UserRole.CONDUCTOR])] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const parsed = LocationUpdateSchema.safeParse(req.body);
      if (!parsed.success)
        return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.format() } });

      try {
        const user: any = (req as any).user;
        const tripId = req.params.id;

        await LocationService.assertConductorOwnsActiveTrip(tripId, user.id);
        const locationId = await LocationService.save(tripId, user.id, parsed.data);

        // Fire-and-forget geo check — never blocks the 10s ping
        GeoService.checkStopProximity(tripId, parsed.data.lat, parsed.data.lng)
          .then((n) => { if (n > 0) fastify.log.info(`[Geo] Trip ${tripId}: ${n} alert(s) triggered`); })
          .catch((e) => fastify.log.error(`[Geo] Proximity error for trip ${tripId}: ${e}`));

        return reply.status(202).send({ success: true, data: { location_id: locationId } });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // GET /trips/:id/location — current bus location (any auth)
  fastify.get(
    '/:id/location',
    { preHandler: [requireAuth()] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const location = await TripsService.getCurrentLocation(req.params.id);
        if (!location)
          return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'No location data for this trip yet' } });
        return reply.send({ success: true, data: location });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // POST /trips/:id/passengers — add single passenger (operator | admin)
  fastify.post(
    '/:id/passengers',
    { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.ADMIN])] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const parsed = AddPassengerSchema.safeParse(req.body);
      if (!parsed.success)
        return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.format() } });

      try {
        const passenger = await TripsService.addPassenger(req.params.id, parsed.data);
        return reply.status(201).send({ success: true, data: passenger });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ─────────────────────────────────────────────────────────────────
  // Sprint 4 — new routes
  // ─────────────────────────────────────────────────────────────────

  // GET /trips — list trips for agency, optional ?status filter (operator | owner | driver | admin)
  fastify.get(
    '/',
    { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.DRIVER, UserRole.ADMIN])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const queryParsed = ListTripsQuerySchema.safeParse(req.query);
        if (!queryParsed.success)
          return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: queryParsed.error.format() } });

        const user: any = (req as any).user;
        const tripsList = await TripsService.listTrips(user.agencyId, queryParsed.data.status);

        return reply.send({
          success: true,
          data: tripsList,
          meta: {
            count: tripsList.length,
            timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // GET /trips/:id/status — rich status response (includes driver role)
  fastify.get(
    '/:id/status',
    { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.CONDUCTOR, UserRole.DRIVER, UserRole.ADMIN])] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const status = await TripsService.getTripStatus(req.params.id);
        return reply.send({
          success: true,
          data: status,
          meta: { timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // GET /trips/:id/passengers — passenger list with alert status (includes driver after takeover)
  fastify.get(
    '/:id/passengers',
    { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.CONDUCTOR, UserRole.DRIVER, UserRole.ADMIN])] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const passengers = await TripsService.listPassengers(req.params.id);
        return reply.send({
          success: true,
          data: passengers,
          meta: {
            count: passengers.length,
            timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // ─────────────────────────────────────────────────────────────────
  // Sprint 6 — Takeover API
  // ─────────────────────────────────────────────────────────────────

  // PUT /trips/:id/takeover — driver takes over from offline conductor
  fastify.put(
    '/:id/takeover',
    { preHandler: [requireAuth([UserRole.DRIVER])] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const user: any = (req as any).user;
        const result = await TakeoverService.takeoverTrip(req.params.id, user.id, fastify);
        return reply.send({
          success: true,
          data: result,
          meta: { timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );

  // POST /trips/:id/passengers/upload — CSV / xlsx bulk upload
  // Uses multipart/form-data; Fastify requires @fastify/multipart plugin
  fastify.post(
    '/:id/passengers/upload',
    { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.ADMIN])] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const user: any = (req as any).user;

        // @fastify/multipart calls req.file() — collect file parts
        const data = await (req as any).file();
        if (!data) {
          return reply.status(400).send({
            success: false,
            error: { code: 'NO_FILE', message: 'No file uploaded. Use multipart/form-data with field name "file"' },
          });
        }

        const { mimetype, filename } = data;
        const ext = filename?.split('.').pop()?.toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
          return reply.status(415).send({
            success: false,
            error: { code: 'UNSUPPORTED_FILE_TYPE', message: 'Only .csv, .xlsx and .xls files are accepted' },
          });
        }

        // Buffer the stream
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        const result = await uploadPassengers(
          req.params.id,
          user.agencyId,
          buffer,
          mimetype,
          filename ?? `upload.${ext}`
        );

        return reply.status(201).send({
          success: true,
          data: result,
          meta: { timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
        });
      } catch (err) { return handleError(reply, err); }
    }
  );
}
