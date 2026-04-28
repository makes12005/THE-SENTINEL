"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREFIX_RATE_LIMIT = exports.PREFIX_BLACKLIST = exports.redis = void 0;
const load_env_1 = require("./load-env");
const ioredis_1 = __importDefault(require("ioredis"));
(0, load_env_1.loadEnv)();
function normalizeRedisUrl(rawValue) {
    if (!rawValue)
        return 'redis://localhost:6379';
    const trimmed = rawValue.trim();
    const cliMatch = trimmed.match(/-u\s+("?)(redis:\/\/[^\s"]+)\1/);
    const extracted = cliMatch?.[2] ?? trimmed;
    // Upstash endpoints require TLS even when the injected URL uses redis://.
    if (extracted.startsWith('redis://') && extracted.includes('.upstash.io')) {
        return `rediss://${extracted.slice('redis://'.length)}`;
    }
    if (trimmed.includes('--tls') && extracted.startsWith('redis://')) {
        return `rediss://${extracted.slice('redis://'.length)}`;
    }
    if (extracted.startsWith('redis://') || extracted.startsWith('rediss://')) {
        return extracted;
    }
    return 'redis://localhost:6379';
}
exports.redis = new ioredis_1.default(normalizeRedisUrl(process.env.REDIS_URL));
// Key prefixes
exports.PREFIX_BLACKLIST = 'jwt_bl:';
exports.PREFIX_RATE_LIMIT = 'login_rl:';
