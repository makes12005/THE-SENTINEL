/**
 * Templates HTTP Layer
 *
 * POST   /api/templates        — create template
 * GET    /api/templates        — list templates (enriched)
 * GET    /api/templates/:id    — get single template
 * PUT    /api/templates/:id    — update template
 * DELETE /api/templates/:id    — soft delete template
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../auth/auth.middleware';
import { CreateTemplateSchema, UserRole } from '../../lib/shared-types';
import { TemplatesService } from './templates.service';

export default async function templatesRoutes(fastify: FastifyInstance) {
  const allowedRoles = [UserRole.OPERATOR, UserRole.OWNER, UserRole.ADMIN];

  function getAgencyIdOrReply(req: FastifyRequest, reply: FastifyReply): string | null {
    const agencyId = req.user.agency_id ?? req.user.agencyId ?? null;
    if (!agencyId) {
      reply.status(400).send({
        success: false,
        error: { code: 'AGENCY_REQUIRED', message: 'User has no agency assigned' },
      });
      return null;
    }
    return agencyId;
  }

  function handleErr(reply: FastifyReply, err: any) {
    return reply.status(err.statusCode ?? 500).send({
      success: false,
      error: { code: err.code ?? 'REQUEST_FAILED', message: err.message ?? 'An error occurred' },
    });
  }

  // ── POST /api/templates ──────────────────────────────────────────────────
  fastify.post('/', { preHandler: [requireAuth(allowedRoles)] }, async (req, reply) => {
    try {
      const parsed = CreateTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid data' },
        });
      }
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;

      const template = await TemplatesService.createTemplate(agencyId, req.user.id, parsed.data);
      return reply.status(201).send({ success: true, data: template });
    } catch (err: any) { return handleErr(reply, err); }
  });

  // ── GET /api/templates ───────────────────────────────────────────────────
  fastify.get('/', { preHandler: [requireAuth(allowedRoles)] }, async (req, reply) => {
    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      const templates = await TemplatesService.listTemplates(agencyId);
      return reply.send({ success: true, data: templates, meta: { count: templates.length } });
    } catch (err: any) { return handleErr(reply, err); }
  });

  // ── GET /api/templates/:id ───────────────────────────────────────────────
  fastify.get('/:id', { preHandler: [requireAuth(allowedRoles)] }, async (req, reply) => {
    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      const { id } = req.params as { id: string };
      const template = await TemplatesService.getTemplate(id, agencyId);
      return reply.send({ success: true, data: template });
    } catch (err: any) { return handleErr(reply, err); }
  });

  // ── PUT /api/templates/:id ───────────────────────────────────────────────
  fastify.put('/:id', { preHandler: [requireAuth(allowedRoles)] }, async (req, reply) => {
    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const template = await TemplatesService.updateTemplate(id, agencyId, body);
      return reply.send({ success: true, data: template });
    } catch (err: any) { return handleErr(reply, err); }
  });

  // ── DELETE /api/templates/:id ────────────────────────────────────────────
  fastify.delete('/:id', { preHandler: [requireAuth(allowedRoles)] }, async (req, reply) => {
    try {
      const agencyId = getAgencyIdOrReply(req, reply);
      if (!agencyId) return;
      const { id } = req.params as { id: string };
      const result = await TemplatesService.deleteTemplate(id, agencyId);
      return reply.send({ success: true, data: result });
    } catch (err: any) { return handleErr(reply, err); }
  });
}
