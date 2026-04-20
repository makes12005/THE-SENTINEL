import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = new Redis(redisUrl);

// Key prefixes
export const PREFIX_BLACKLIST = 'jwt_bl:';
export const PREFIX_RATE_LIMIT = 'login_rl:';
