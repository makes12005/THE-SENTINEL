"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = agencyResourceRoutes;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const shared_types_1 = require("../../lib/shared-types");
const auth_middleware_1 = require("../auth/auth.middleware");
const bus_service_1 = require("./bus.service");
function getAgencyIdOrReply(req, reply) {
    const agencyId = req.user.agency_id ?? req.user.agencyId ?? null;
    if (!agencyId) {
        reply.status(400).send({
            success: false,
            error: {
                code: 'AGENCY_REQUIRED',
                message: 'User has no agency assigned',
            },
        });
        return null;
    }
    return agencyId;
}
function handleError(reply, err) {
    return reply.status(err.statusCode ?? 500).send({
        success: false,
        error: {
            code: err.code ?? 'REQUEST_FAILED',
            message: err.message ?? 'An error occurred',
        },
    });
}
async function logAudit(userId, action, entityType, entityId, metadata) {
    await db_1.db.insert(schema_1.auditLogs).values({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
    });
}
async function listAgencyMembers(agencyId, role) {
    const rows = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
      ${role ? (0, drizzle_orm_1.sql) `and u.role = ${role}` : (0, drizzle_orm_1.sql) ``}
    group by u.id, creator.name
    order by u.role asc, u.created_at desc
  `);
    return rows.map((row) => ({
        ...row,
        trips_count: Number(row.trips_count ?? 0),
    }));
}
async function createAgencyMember(agencyId, creatorId, body) {
    const parsed = shared_types_1.CreateAgencyMemberSchema.safeParse(body);
    if (!parsed.success) {
        throw Object.assign(new Error('Please provide a valid name, phone, role, and password'), {
            statusCode: 400,
            code: 'VALIDATION_ERROR',
        });
    }
    const { name, phone, password, role } = parsed.data;
    const [existing] = await db_1.db
        .select({ id: schema_1.users.id })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.users.phone, phone), (0, drizzle_orm_1.inArray)(schema_1.users.role, ['conductor', 'driver'])))
        .limit(1);
    if (existing) {
        throw Object.assign(new Error(`A ${role} with this phone number already exists in your agency`), { statusCode: 409, code: 'MEMBER_ALREADY_EXISTS' });
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    const [member] = await db_1.db
        .insert(schema_1.users)
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
        id: schema_1.users.id,
        name: schema_1.users.name,
        phone: schema_1.users.phone,
        role: schema_1.users.role,
        is_active: schema_1.users.is_active,
        added_by: schema_1.users.added_by,
        created_at: schema_1.users.created_at,
    });
    await logAudit(creatorId, 'AGENCY_MEMBER_CREATED', 'user', member.id, {
        agency_id: agencyId,
        member_role: role,
    });
    return member;
}
async function toggleAgencyMember(agencyId, actorId, memberId, desiredActive) {
    const [member] = await db_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
        role: schema_1.users.role,
        is_active: schema_1.users.is_active,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, memberId), (0, drizzle_orm_1.eq)(schema_1.users.agency_id, agencyId), (0, drizzle_orm_1.inArray)(schema_1.users.role, ['conductor', 'driver'])))
        .limit(1);
    if (!member) {
        throw Object.assign(new Error('Staff member not found in your agency'), { statusCode: 404, code: 'MEMBER_NOT_FOUND' });
    }
    const nextStatus = typeof desiredActive === 'boolean' ? desiredActive : !member.is_active;
    if (!nextStatus) {
        const memberTripColumn = member.role === 'conductor' ? schema_1.trips.conductor_id : schema_1.trips.driver_id;
        const [activeTrip] = await db_1.db
            .select({ id: schema_1.trips.id })
            .from(schema_1.trips)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(memberTripColumn, memberId), (0, drizzle_orm_1.inArray)(schema_1.trips.status, ['scheduled', 'active'])))
            .limit(1);
        if (activeTrip) {
            throw Object.assign(new Error(`This ${member.role} is assigned to an active trip and cannot be deactivated`), { statusCode: 409, code: 'MEMBER_IN_ACTIVE_TRIP' });
        }
    }
    const [updated] = await db_1.db
        .update(schema_1.users)
        .set({ is_active: nextStatus })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, memberId))
        .returning({
        id: schema_1.users.id,
        is_active: schema_1.users.is_active,
        role: schema_1.users.role,
    });
    await logAudit(actorId, nextStatus ? 'AGENCY_MEMBER_ACTIVATED' : 'AGENCY_MEMBER_DEACTIVATED', 'user', memberId, {
        agency_id: agencyId,
        member_role: member.role,
    });
    return updated;
}
async function agencyResourceRoutes(fastify) {
    const resourceRoles = [shared_types_1.UserRole.OPERATOR, shared_types_1.UserRole.OWNER, shared_types_1.UserRole.ADMIN];
    fastify.get('/agency/operators', { preHandler: [(0, auth_middleware_1.requireAuth)(resourceRoles)] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const operators = await db_1.db
                .select({
                id: schema_1.users.id,
                name: schema_1.users.name,
                phone: schema_1.users.phone,
                is_active: schema_1.users.is_active,
                created_at: schema_1.users.created_at,
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.agency_id, agencyId), (0, drizzle_orm_1.eq)(schema_1.users.role, 'operator')))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.users.created_at));
            return reply.send({ success: true, data: operators, meta: { count: operators.length, timestamp: new Date().toISOString() } });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.get('/agency/buses', { preHandler: [(0, auth_middleware_1.requireAuth)(resourceRoles)] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const busesList = await bus_service_1.BusService.listBuses(agencyId);
            return reply.send({ success: true, data: busesList, meta: { count: busesList.length, timestamp: new Date().toISOString() } });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.post('/agency/buses', { preHandler: [(0, auth_middleware_1.requireAuth)(resourceRoles)] }, async (req, reply) => {
        const parsed = shared_types_1.CreateBusSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid bus number plate and capacity' } });
        }
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const bus = await bus_service_1.BusService.createBus(agencyId, req.user.id, parsed.data);
            return reply.status(201).send({ success: true, data: bus });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.put('/agency/buses/:id', { preHandler: [(0, auth_middleware_1.requireAuth)(resourceRoles)] }, async (req, reply) => {
        const parsed = shared_types_1.UpdateBusSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide valid bus details to update' } });
        }
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const bus = await bus_service_1.BusService.updateBus(req.params.id, agencyId, req.user.id, parsed.data);
            return reply.send({ success: true, data: bus });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    fastify.delete('/agency/buses/:id', { preHandler: [(0, auth_middleware_1.requireAuth)(resourceRoles)] }, async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const bus = await bus_service_1.BusService.deactivateBus(req.params.id, agencyId, req.user.id);
            return reply.send({ success: true, data: bus });
        }
        catch (err) {
            return handleError(reply, err);
        }
    });
    const listMembersHandler = async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const query = req.query ?? {};
            const members = await listAgencyMembers(agencyId, query.role);
            return reply.send({ success: true, data: members, meta: { count: members.length, timestamp: new Date().toISOString() } });
        }
        catch (err) {
            return handleError(reply, err);
        }
    };
    const createMembersHandler = async (req, reply) => {
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const member = await createAgencyMember(agencyId, req.user.id, req.body);
            return reply.status(201).send({ success: true, data: member });
        }
        catch (err) {
            return handleError(reply, err);
        }
    };
    const toggleMembersHandler = async (req, reply) => {
        const parsed = shared_types_1.ToggleAgencyMemberSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid member status update' } });
        }
        try {
            const agencyId = getAgencyIdOrReply(req, reply);
            if (!agencyId)
                return;
            const member = await toggleAgencyMember(agencyId, req.user.id, req.params.id, parsed.data.is_active);
            return reply.send({ success: true, data: member });
        }
        catch (err) {
            return handleError(reply, err);
        }
    };
    fastify.get('/agency/members', { preHandler: [(0, auth_middleware_1.requireAuth)(resourceRoles)] }, listMembersHandler);
    fastify.post('/agency/members', { preHandler: [(0, auth_middleware_1.requireAuth)(resourceRoles)] }, createMembersHandler);
    fastify.put('/agency/members/:id/toggle', { preHandler: [(0, auth_middleware_1.requireAuth)(resourceRoles)] }, toggleMembersHandler);
    // Compatibility aliases while the frontend is being migrated.
    fastify.get('/agency/staff', { preHandler: [(0, auth_middleware_1.requireAuth)(resourceRoles)] }, listMembersHandler);
    fastify.post('/agency/staff', { preHandler: [(0, auth_middleware_1.requireAuth)(resourceRoles)] }, createMembersHandler);
    fastify.put('/agency/staff/:id/toggle', { preHandler: [(0, auth_middleware_1.requireAuth)(resourceRoles)] }, toggleMembersHandler);
    fastify.patch('/agency/staff/:id/toggle', { preHandler: [(0, auth_middleware_1.requireAuth)(resourceRoles)] }, toggleMembersHandler);
    fastify.patch('/agency/members/:id/toggle', { preHandler: [(0, auth_middleware_1.requireAuth)(resourceRoles)] }, toggleMembersHandler);
}
