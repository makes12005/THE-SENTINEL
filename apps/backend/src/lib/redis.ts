import { loadEnv } from './load-env';
import Redis from 'ioredis';

loadEnv();

function normalizeRedisUrl(rawValue?: string): string {
  if (!rawValue) return 'redis://localhost:6379';

  const trimmed = rawValue.trim();
  const cliMatch = trimmed.match(/-u\s+("?)(redis:\/\/[^\s"]+)\1/);
  const extracted = cliMatch?.[2] ?? trimmed;

  if (trimmed.includes('--tls') && extracted.startsWith('redis://')) {
    return `rediss://${extracted.slice('redis://'.length)}`;
  }

  if (extracted.startsWith('redis://') || extracted.startsWith('rediss://')) {
    return extracted;
  }

  return 'redis://localhost:6379';
}

export const redis = new Redis(normalizeRedisUrl(process.env.REDIS_URL));

// Key prefixes
export const PREFIX_BLACKLIST = 'jwt_bl:';
export const PREFIX_RATE_LIMIT = 'login_rl:';
