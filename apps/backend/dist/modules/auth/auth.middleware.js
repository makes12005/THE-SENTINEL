"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = require("../../lib/redis");
function requireAuth(roles) {
    return async function authMiddleware(request, reply) {
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
            if (!secret)
                throw new Error('JWT_SECRET is not configured');
            const payload = jsonwebtoken_1.default.verify(token, secret);
            const userId = payload.id ?? payload.sub;
            if (!userId || !payload.role) {
                return reply.status(401).send({
                    success: false,
                    error: { code: 'INVALID_TOKEN', message: 'Invalid token payload' }
                });
            }
            const blacklistKey = payload.jti ? `${redis_1.PREFIX_BLACKLIST}${payload.jti}` : `${redis_1.PREFIX_BLACKLIST}${token}`;
            const isBlacklisted = await redis_1.redis.get(blacklistKey);
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
            const agencyId = payload.agencyId ?? payload.agency_id ?? null;
            request.user = {
                id: userId,
                role: payload.role,
                agencyId,
                agency_id: agencyId,
                name: payload.name
            };
        }
        catch (err) {
            return reply.status(401).send({
                success: false,
                error: { code: 'UNAUTHORIZED', message: err?.message ?? 'Invalid token' }
            });
        }
    };
}
