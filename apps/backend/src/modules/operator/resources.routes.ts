import bcrypt from 'bcryptjs';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../../db';
import { auditLogs, buses, trips, users } from '../../db/schema';
import {
  CreateAgencyMemberSchema,
  CreateBusSchema,
  ToggleAgencyMemberSchema,
  UpdateBusSchema,
  UserRole,
} from '../../lib/shared-types';
import { requireAuth } from '../auth/auth.middleware';
import { BusService } from './bus.service';

function handleError(reply: FastifyReply, err: any) {
  return reply.status(err.statusCode ?? 500).send({
    success: false,
    error: {
      code: err.code ?? 'REQUEST_FAILED',
      message: err.message ?? 'An error occurred',
    },
  });
}

async function logAudit(userId: string, action: string, entityType: string, entityId: string, metadata?: Record<string, unknown>) {
  await db.insert(auditLogs).values({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

async function listAgencyMembers(agencyId: string, role?: 'conductor' | 'driver') {
  const rows = await db.execute<{
    id: string;
    name: string;
    phone: string | null;
    role: 'conductor' | 'driver';
    is_active: boolean;
    added_by: string | null;
    added_by_name: string | null;
    trips_count: string;
    last_active_at: string | null;
    created_at: string;
  }>(sql`
    select
      u.id,
      u.name,
      u.phone,
      u.role,
      u.is_active,
      u.added_by,
      creator.name as added_by_name,
      count(t.id)::text as trips_count,
      max(t.created_at)::text as last_active_at,
      u.created_at::text as created_at
    from users u
    left join users creator on creator.id = u.added_by
    left join trips t
      on (t.conductor_id = u.id or t.driver_id = u.id)
    where u.agency_id = ${agencyId}
      and u.role in ('conductor', 'driver')
      ${role ? sql`and u.role = ${role}` : sql``}
    group by u.id, creator.name
    order by u.role asc, u.created_at desc
  `);

  return rows.map((row) => ({
    ...row,
    trips_count: Number(row.trips_count ?? 0),
  }));
}

async function createAgencyMember(agencyId: string, creatorId: string, body: unknown) {
  const parsed = CreateAgencyMemberSchema.safeParse(body);
  if (!parsed.success) {
    throw Object.assign(new Error('Please provide a valid name, phone, role, and password'), {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  const { name, phone, password, role } = parsed.data;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.agency_id, agencyId), eq(users.phone, phone), inArray(users.role, ['conductor', 'driver'])))
    .limit(1);

  if (existing) {
    throw Object.assign(
      new Error(`A ${role} with this phone number already exists in your agency`),
      { statusCode: 409, code: 'MEMBER_ALREADY_EXISTS' }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [member] = await db
    .insert(users)
    .values({
      agency_id: agencyId,
      name: name.trim(),
      phone: phone.trim(),
      password_hash: passwordHash,
      role,
      is_active: true,
      added_by: creatorId,
    })
    .returning({
      id: users.id,
      name: users.name,
      phone: users.phone,
      role: users.role,
      is_active: users.is_active,
      added_by: users.added_by,
      created_at: users.created_at,
    });

  await logAudit(creatorId, 'AGENCY_MEMBER_CREATED', 'user', member.id, {
    agency_id: agencyId,
    member_role: role,
  });

  return member;
}

async function toggleAgencyMember(agencyId: string, actorId: string, memberId: string, desiredActive?: boolean) {
  const [member] = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      is_active: users.is_active,
    })
    .from(users)
    .where(and(eq(users.id, memberId), eq(users.agency_id, agencyId), inArray(users.role, ['conductor', 'driver'])))
    .limit(1);

  if (!member) {
    throw Object.assign(new Error('Staff member not found in your agency'), { statusCode: 404, code: 'MEMBER_NOT_FOUND' });
  }

  const nextStatus = typeof desiredActive === 'boolean' ? desiredActive : !member.is_active;

  if (!nextStatus) {
    const memberTripColumn = member.role === 'conductor' ? trips.conductor_id : trips.driver_id;
    const [activeTrip] = await db
      .select({ id: trips.id })
      .from(trips)
      .where(and(eq(memberTripColumn, memberId), inArray(trips.status, ['scheduled', 'active'])))
      .limit(1);

    if (activeTrip) {
      throw Object.assign(
        new Error(`This ${member.role} is assigned to an active trip and cannot be deactivated`),
        { statusCode: 409, code: 'MEMBER_IN_ACTIVE_TRIP' }
      );
    }
  }

  const [updated] = await db
    .update(users)
    .set({ is_active: nextStatus })
    .where(eq(users.id, memberId))
    .returning({
      id: users.id,
      is_active: users.is_active,
      role: users.role,
    });

  await logAudit(actorId, nextStatus ? 'AGENCY_MEMBER_ACTIVATED' : 'AGENCY_MEMBER_DEACTIVATED', 'user', memberId, {
    agency_id: agencyId,
    member_role: member.role,
  });

  return updated;
}

export default async function agencyResourceRoutes(fastify: FastifyInstance) {
  const resourceRoles = [UserRole.OPERATOR, UserRole.OWNER, UserRole.ADMIN];

  fastify.get('/agency/operators', { preHandler: [requireAuth(resourceRoles)] }, async (req, reply) => {
    try {
      const operators = await db
        .select({
          id: users.id,
          name: users.name,
          phone: users.phone,
          is_active: users.is_active,
          created_at: users.created_at,
        })
        .from(users)
        .where(and(eq(users.agency_id, req.user.agencyId as string), eq(users.role, 'operator')))
        .orderBy(desc(users.created_at));

      return reply.send({ success: true, data: operators, meta: { count: operators.length, timestamp: new Date().toISOString() } });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.get('/agency/buses', { preHandler: [requireAuth(resourceRoles)] }, async (req, reply) => {
    try {
      const busesList = await BusService.listBuses(req.user.agencyId as string);
      return reply.send({ success: true, data: busesList, meta: { count: busesList.length, timestamp: new Date().toISOString() } });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.post('/agency/buses', { preHandler: [requireAuth(resourceRoles)] }, async (req, reply) => {
    const parsed = CreateBusSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid bus number plate and capacity' } });
    }

    try {
      const bus = await BusService.createBus(req.user.agencyId as string, req.user.id, parsed.data);
      return reply.status(201).send({ success: true, data: bus });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.put('/agency/buses/:id', { preHandler: [requireAuth(resourceRoles)] }, async (req, reply) => {
    const parsed = UpdateBusSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide valid bus details to update' } });
    }

    try {
      const bus = await BusService.updateBus((req.params as { id: string }).id, req.user.agencyId as string, req.user.id, parsed.data);
      return reply.send({ success: true, data: bus });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  fastify.delete('/agency/buses/:id', { preHandler: [requireAuth(resourceRoles)] }, async (req, reply) => {
    try {
      const bus = await BusService.deactivateBus((req.params as { id: string }).id, req.user.agencyId as string, req.user.id);
      return reply.send({ success: true, data: bus });
    } catch (err) {
      return handleError(reply, err);
    }
  });

  const listMembersHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = (req.query as { role?: 'conductor' | 'driver' }) ?? {};
      const members = await listAgencyMembers(req.user.agencyId as string, query.role);
      return reply.send({ success: true, data: members, meta: { count: members.length, timestamp: new Date().toISOString() } });
    } catch (err) {
      return handleError(reply, err);
    }
  };

  const createMembersHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const member = await createAgencyMember(req.user.agencyId as string, req.user.id, req.body);
      return reply.status(201).send({ success: true, data: member });
    } catch (err) {
      return handleError(reply, err);
    }
  };

  const toggleMembersHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = ToggleAgencyMemberSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid member status update' } });
    }

    try {
      const member = await toggleAgencyMember(
        req.user.agencyId as string,
        req.user.id,
        (req.params as { id: string }).id,
        parsed.data.is_active
      );
      return reply.send({ success: true, data: member });
    } catch (err) {
      return handleError(reply, err);
    }
  };

  fastify.get('/agency/members', { preHandler: [requireAuth(resourceRoles)] }, listMembersHandler);
  fastify.post('/agency/members', { preHandler: [requireAuth(resourceRoles)] }, createMembersHandler);
  fastify.put('/agency/members/:id/toggle', { preHandler: [requireAuth(resourceRoles)] }, toggleMembersHandler);

  // Compatibility aliases while the frontend is being migrated.
  fastify.get('/agency/staff', { preHandler: [requireAuth(resourceRoles)] }, listMembersHandler);
  fastify.post('/agency/staff', { preHandler: [requireAuth(resourceRoles)] }, createMembersHandler);
  fastify.put('/agency/staff/:id/toggle', { preHandler: [requireAuth(resourceRoles)] }, toggleMembersHandler);
  fastify.patch('/agency/staff/:id/toggle', { preHandler: [requireAuth(resourceRoles)] }, toggleMembersHandler);
  fastify.patch('/agency/members/:id/toggle', { preHandler: [requireAuth(resourceRoles)] }, toggleMembersHandler);
}
