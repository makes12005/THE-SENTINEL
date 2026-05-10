import { and, desc, eq, sql } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { agencies, geoCoordinatesLibrary } from '../../db/schema';
import { GeoLibraryCreateSchema, UserRole } from '../../lib/shared-types';
import { requireAuth } from '../auth/auth.middleware';

export default async function geoLibraryRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (req, reply) => {
    const query = req.query as { search?: string; limit?: string };
    const search = query.search?.trim().toLowerCase() ?? '';
    const limit = Math.min(Math.max(Number(query.limit ?? '20'), 1), 100);

    const rows = await db
      .select()
      .from(geoCoordinatesLibrary)
      .where(
        and(
          eq(geoCoordinatesLibrary.verified, true),
          search
            ? sql`lower(${geoCoordinatesLibrary.name}) like ${`%${search}%`}`
            : sql`true`
        )
      )
      .orderBy(desc(geoCoordinatesLibrary.use_count), desc(geoCoordinatesLibrary.created_at))
      .limit(limit);

    return reply.send({
      success: true,
      data: rows.map((row) => ({
        ...row,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
      })),
      meta: { count: rows.length },
    });
  });

  fastify.post(
    '/',
    { preHandler: [requireAuth([UserRole.CONDUCTOR, UserRole.DRIVER])] },
    async (req, reply) => {
      const parsed = GeoLibraryCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid name and coordinates.' },
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
        .insert(geoCoordinatesLibrary)
        .values({
          name: parsed.data.name,
          latitude: String(parsed.data.latitude),
          longitude: String(parsed.data.longitude),
          captured_by_user_id: req.user.id,
          captured_by_name: req.user.name ?? 'Unknown user',
          agency_id: agencyId,
          agency_name: agency.name,
          verified: false,
          use_count: 0,
        })
        .returning();

      return reply.status(201).send({
        success: true,
        data: {
          ...created,
          latitude: Number(created.latitude),
          longitude: Number(created.longitude),
        },
      });
    }
  );
}
