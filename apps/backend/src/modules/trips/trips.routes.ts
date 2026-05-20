import { and, eq } from 'drizzle-orm';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../../db';
import { auditLogs, routes, trips, users } from '../../db/schema';
import { emitSocketEvent } from '../../lib/socket';
import {
  AddPassengerSchema,
  BatchAddPassengersSchema,
  BoardingChecklistUpdateSchema,
  ConfirmPassengersSchema,
  AssignTripSchema,
  CreateTripSchema,
  ListTripsQuerySchema,
  LocationUpdateSchema,
  UserRole,
} from '../../lib/shared-types';
import { requireAuth } from '../auth/auth.middleware';
import { verifyTripAgency } from './trip-auth.helper';
import { GeoService } from './geo.service';
import { LocationService } from './location.service';
import { confirmPassengerUpload, previewPassengerUpload } from './passenger-upload.service';
import { TakeoverService } from './takeover.service';
import { TripsService } from './trips.service';

function handleError(reply: FastifyReply, err: any) {
  const body: Record<string, unknown> = {
    success: false,
    error: {
      code: err.code ?? 'REQUEST_FAILED',
      message: err.message ?? 'An error occurred',
    },
  };
  if (err.rowErrors) body.row_errors = err.rowErrors;
  return reply.status(err.statusCode ?? 500).send(body);
}

export default async function tripsRoutes(fastify: FastifyInstance) {
  const getTripId = (req: FastifyRequest) => (req.params as { id: string }).id;
  const getAgencyIdOrReply = (req: FastifyRequest, reply: FastifyReply): string | null => {
    const agencyId = req.user.agency_id ?? req.user.agencyId ?? null;
    if (!agencyId && req.user.role !== UserRole.ADMIN) {
      reply.status(400).send({
        success: false,
        error: { code: 'AGENCY_REQUIRED', message: 'User has no agency assigned' },
      });
      return null;
    }
    return agencyId;
  };

  fastify.post('/', { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    const parsed = CreateTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide valid trip details' } });
    }

    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      const trip = await TripsService.createTrip(req.user.id, agencyId, parsed.data);
      return reply.status(201).send({ success: true, data: trip });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.get('/', { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.CONDUCTOR, UserRole.DRIVER, UserRole.ADMIN])] }, async (req, reply) => {
    const parsed = ListTripsQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid trip filters' } });
    }

    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      console.log(`[DEBUG] GET /trips - User: ${req.user.id}, Role: ${req.user.role}, Agency: ${agencyId}`);
      const data = await TripsService.listTrips(agencyId, req.user.id, req.user.role, parsed.data);
      return reply.send({ success: true, data, meta: { count: data.length, timestamp: new Date().toISOString() } });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.get('/:id', { preHandler: [requireAuth()] }, async (req, reply) => {
    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(getTripId(req), agencyId, req.user.id, req.user.role);
      const trip = await TripsService.getTrip(getTripId(req));
      return reply.send({ success: true, data: trip });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.get('/:id/status', { preHandler: [requireAuth()] }, async (req, reply) => {
    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(getTripId(req), agencyId, req.user.id, req.user.role);
      const status = await TripsService.getTripStatus(getTripId(req));
      return reply.send({ success: true, data: status });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.get('/:id/passengers', { preHandler: [requireAuth()] }, async (req, reply) => {
    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(getTripId(req), agencyId, req.user.id, req.user.role);
      const passengers = await TripsService.listPassengers(getTripId(req));
      return reply.send({ success: true, data: passengers, meta: { count: passengers.length, timestamp: new Date().toISOString() } });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.put('/:id/start', { preHandler: [requireAuth([UserRole.CONDUCTOR])] }, async (req, reply) => {
    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(getTripId(req), agencyId, req.user.id, req.user.role);
      const parsed = BoardingChecklistUpdateSchema.safeParse((req.body ?? { passengers: [] }));
      const checklist = parsed.success ? parsed.data.passengers : undefined;
      const trip = await TripsService.startTrip(getTripId(req), req.user.id, checklist);
      return reply.send({ success: true, data: trip });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.put('/:id/complete', { preHandler: [requireAuth([UserRole.CONDUCTOR])] }, async (req, reply) => {
    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(getTripId(req), agencyId, req.user.id, req.user.role);
      const trip = await TripsService.completeTrip(getTripId(req), req.user.id);
      return reply.send({ success: true, data: trip });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.post('/:id/location', { preHandler: [requireAuth([UserRole.CONDUCTOR])] }, async (req, reply) => {
    const parsed = LocationUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid GPS update' } });
    }

    try {
      const tripId = getTripId(req);
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(tripId, agencyId, req.user.id, req.user.role);
      await LocationService.assertConductorOwnsActiveTrip(tripId, req.user.id);
      const locationId = await LocationService.save(tripId, req.user.id, parsed.data);
      GeoService.checkStopProximity(tripId, parsed.data.lat!, parsed.data.lng!).catch((error) => {
        fastify.log.error({ error }, '[Geo] proximity check failed');
      });
      return reply.status(202).send({ success: true, data: { location_id: locationId } });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.get('/:id/location', { preHandler: [requireAuth()] }, async (req, reply) => {
    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(getTripId(req), agencyId, req.user.id, req.user.role);
      const location = await TripsService.getCurrentLocation(getTripId(req));
      if (!location) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'No location data for this trip yet' } });
      }
      return reply.send({ success: true, data: location });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.post('/:id/passengers', { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    const parsed = AddPassengerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide valid passenger details' } });
    }

    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(getTripId(req), agencyId, req.user.id, req.user.role);
      const passenger = await TripsService.addPassenger(getTripId(req), parsed.data);
      return reply.status(201).send({ success: true, data: passenger });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.post('/:id/passengers/batch', { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    const parsed = BatchAddPassengersSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide valid passenger details' } });
    }

    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(getTripId(req), agencyId, req.user.id, req.user.role);
      const passengers = await TripsService.batchAddPassengers(getTripId(req), parsed.data);
      return reply.status(201).send({ success: true, data: passengers });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.post('/:id/passengers/upload', { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(getTripId(req), agencyId, req.user.id, req.user.role);
      const data = await (req as any).file();
      if (!data) {
        return reply.status(400).send({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded. Use multipart/form-data with field name \"file\"' } });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      const result = await previewPassengerUpload(buffer, data.mimetype, data.filename);
      return reply.status(200).send({ success: true, data: result });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.post('/:id/passengers/confirm', { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(getTripId(req), agencyId, req.user.id, req.user.role);
      const parsed = ConfirmPassengersSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Please review passenger rows before confirming.' },
        });
      }

      const result = await confirmPassengerUpload(getTripId(req), parsed.data);
      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.put('/:id/takeover', { preHandler: [requireAuth([UserRole.DRIVER])] }, async (req, reply) => {
    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(getTripId(req), agencyId, req.user.id, req.user.role);
      const result = await TakeoverService.takeoverTrip(getTripId(req), req.user.id, fastify);
      return reply.send({ success: true, data: result });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  const reassignHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AssignTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please select a valid operator to reassign this trip' } });
    }

    try {
      const tripId = getTripId(req);
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(tripId, agencyId, req.user.id, req.user.role);

      const [trip] = await db
        .select({
          id: trips.id,
          status: trips.status,
          owned_by_operator_id: trips.owned_by_operator_id,
          route_name: routes.name,
        })
        .from(trips)
        .innerJoin(routes, eq(routes.id, trips.route_id))
        .where(eq(trips.id, tripId))
        .limit(1);

      if (!trip) {
        return reply.status(404).send({ success: false, error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' } });
      }

      // Only owner and admin can reassign trips (operators cannot reassign)
      if (req.user.role === UserRole.OPERATOR) {
        return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Only agency owners can reassign trips' } });
      }

      const [targetOperator] = await db
        .select({ id: users.id, name: users.name, agency_id: users.agency_id, role: users.role, is_active: users.is_active })
        .from(users)
        .where(eq(users.id, parsed.data.assigned_operator_id))
        .limit(1);

      if (!targetOperator || targetOperator.agency_id !== agencyId || targetOperator.role !== 'operator') {
        return reply.status(422).send({ success: false, error: { code: 'INVALID_OPERATOR', message: 'Selected operator does not belong to your agency' } });
      }
      if (!targetOperator.is_active) {
        return reply.status(422).send({ success: false, error: { code: 'OPERATOR_INACTIVE', message: 'Selected operator is inactive' } });
      }

      const [updated] = await db
        .update(trips)
        .set({ assigned_operator_id: parsed.data.assigned_operator_id })
        .where(eq(trips.id, tripId))
        .returning();

      await db.insert(auditLogs).values({
        user_id: req.user.id,
        action: 'TRIP_REASSIGNED',
        entity_type: 'trip',
        entity_id: tripId,
        metadata: {
          assigned_operator_id: parsed.data.assigned_operator_id,
          assigned_by: req.user.name ?? req.user.id,
        },
      });

      await emitSocketEvent(`user:${parsed.data.assigned_operator_id}`, 'trip_assigned', {
        tripId,
        tripName: trip.route_name,
        assignedBy: req.user.name ?? 'Agency owner',
      });

      return reply.send({ success: true, data: updated });
    } catch (err) {
      return handleError(reply, err);
    }
  };

  fastify.put('/:id/reassign', { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] }, reassignHandler);
  fastify.post('/:id/assign', { preHandler: [requireAuth([UserRole.OWNER, UserRole.ADMIN])] }, reassignHandler);

  // ── DELETE /api/trips/:id — Only scheduled or expired trips, Owner/Operator only ──
  fastify.delete('/:id', { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.ADMIN])] }, async (req, reply) => {
    try {
      const tripId   = getTripId(req);
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;

      // Check trip exists and status
      const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
      if (!trip) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
      }

      // Only allow deleting scheduled or expired trips
      if (!['scheduled', 'expired'].includes(trip.status)) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Only scheduled or expired trips can be deleted.' },
        });
      }

      // Operator can only delete their own trips; owner can delete any in their agency
      if (req.user.role === UserRole.OPERATOR) {
        if (trip.owned_by_operator_id !== req.user.id) {
          return reply.status(403).send({
            success: false,
            error: { code: 'FORBIDDEN', message: 'You can only delete trips you created.' },
          });
        }
      }

      // For owner, verify trip belongs to their agency
      if (req.user.role === UserRole.OWNER) {
        const [tripOwner] = await db.select({ agency_id: users.agency_id }).from(users)
          .where(eq(users.id, trip.owned_by_operator_id)).limit(1);
        if (!tripOwner || tripOwner.agency_id !== agencyId) {
          return reply.status(403).send({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Trip does not belong to your agency.' },
          });
        }
      }

      await db.delete(trips).where(eq(trips.id, tripId));

      // Audit log
      await db.insert(auditLogs).values({
        user_id: req.user.id,
        action: 'TRIP_DELETED',
        entity_type: 'trip',
        entity_id: tripId,
        metadata: { status_at_deletion: trip.status, deleted_by_role: req.user.role },
        ip_address: req.ip,
      });

      return reply.send({ success: true, data: { id: tripId, deleted: true } });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  // ── Alert Handling ────────────────────────────────────────────────────────
  fastify.put('/:id/passengers/:passengerId/alert/retry', { preHandler: [requireAuth([UserRole.CONDUCTOR])] }, async (req, reply) => {
    try {
      const { id: tripId, passengerId } = req.params as { id: string; passengerId: string };
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(tripId, agencyId, req.user.id, req.user.role);
      
      const result = await TripsService.retryAlert(passengerId);
      return reply.send({ success: true, data: result });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.put('/:id/passengers/:passengerId/alert/manual', { preHandler: [requireAuth([UserRole.CONDUCTOR])] }, async (req, reply) => {
    try {
      const { id: tripId, passengerId } = req.params as { id: string; passengerId: string };
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(tripId, agencyId, req.user.id, req.user.role);
      
      const result = await TripsService.markAlertAsManuallyInformed(passengerId);
      return reply.send({ success: true, data: result });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.post('/:id/alert/broadcast', { preHandler: [requireAuth([UserRole.CONDUCTOR])] }, async (req, reply) => {
    try {
      const tripId = getTripId(req);
      const { type } = req.body as { type: string };
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      await verifyTripAgency(tripId, agencyId, req.user.id, req.user.role);
      
      const result = await TripsService.broadcastAlert(tripId, type);
      return reply.send({ success: true, data: result });
    } catch (err) {
      return handleError(reply, err);
    }
  });
}
