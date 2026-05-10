import { and, desc, eq, sql } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { agencies, popularRoutes } from '../../db/schema';
import { CreatePopularRouteSchema, UserRole } from '../../lib/shared-types';
import { requireAuth } from '../auth/auth.middleware';
import { clonePopularRouteToAgency } from './popular-routes.service';

export default async function popularRoutesModule(fastify: FastifyInstance) {
  fastify.get('/', async (_req, reply) => {
    const rows = await db
      .select()
      .from(popularRoutes)
      .where(eq(popularRoutes.is_approved, true))
      .orderBy(desc(popularRoutes.use_count), desc(popularRoutes.created_at));

    return reply.send({ success: true, data: rows, meta: { count: rows.length } });
  });

  fastify.post(
    '/',
    { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.ADMIN])] },
    async (req, reply) => {
      const parsed = CreatePopularRouteSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid popular route draft.' },
        });
      }

      const agencyId = req.user.agency_id ?? req.user.agencyId;
      if (!agencyId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'AGENCY_REQUIRED', message: 'User has no agency assigned' },
        });
      }

      const [agency] = await db
        .select({ name: agencies.name })
        .from(agencies)
        .where(eq(agencies.id, agencyId))
        .limit(1);

      if (!agency) {
        return reply.status(404).send({
          success: false,
          error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found' },
        });
      }

      const [created] = await db
        .insert(popularRoutes)
        .values({
          name: parsed.data.name,
          from_city: parsed.data.from_city,
          to_city: parsed.data.to_city,
          stops: parsed.data.stops,
          published_by_agency_id: agencyId,
          published_by_agency_name: agency.name,
          is_approved: false,
          use_count: 0,
        })
        .returning();

      return reply.status(201).send({ success: true, data: created });
    }
  );

  fastify.post(
    '/:id/use',
    { preHandler: [requireAuth([UserRole.OPERATOR, UserRole.OWNER, UserRole.ADMIN])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const agencyId = req.user.agency_id ?? req.user.agencyId;
      if (!agencyId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'AGENCY_REQUIRED', message: 'User has no agency assigned' },
        });
      }

      const route = await clonePopularRouteToAgency(id, agencyId, req.user.id);
      return reply.status(201).send({ success: true, data: route });
    }
  );
}
