import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { redis, PREFIX_BLACKLIST } from '../../lib/redis';

type AuthUser = {
  id: string;
  role: string;
  agencyId: string | null;
  name?: string;
};

type TokenPayload = {
  id?: string;
  sub?: string;
  role?: string;
  agency_id?: string | null;
  agencyId?: string | null;
  name?: string;
  jti?: string;
};

export function requireAuth(roles?: string[]) {
  return async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing bearer token' }
      });
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET is not configured');

      const payload = jwt.verify(token, secret) as TokenPayload;
      const userId = payload.id ?? payload.sub;
      if (!userId || !payload.role) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid token payload' }
        });
      }

      const blacklistKey = payload.jti ? `${PREFIX_BLACKLIST}${payload.jti}` : `${PREFIX_BLACKLIST}${token}`;
      const isBlacklisted = await redis.get(blacklistKey);
      if (isBlacklisted) {
        return reply.status(401).send({
          success: false,
          error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked' }
        });
      }

      if (roles?.length && !roles.includes(payload.role)) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
        });
      }

      (request as any).user = {
        id: userId,
        role: payload.role,
        agencyId: payload.agencyId ?? payload.agency_id ?? null,
        name: payload.name
      } satisfies AuthUser;
    } catch (err: any) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: err?.message ?? 'Invalid token' }
      });
    }
  };
}
