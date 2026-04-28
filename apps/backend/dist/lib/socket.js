"use strict";
/**
 * Socket.IO singleton — shared between Fastify server and background workers.
 *
 * init(httpServer) is called once in server.ts.
 * emitSocketEvent() is safe in worker processes because it falls back to
 * Redis pub/sub when the local Socket.IO server is not running.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketIO = initSocketIO;
exports.emitSocketEvent = emitSocketEvent;
exports.getIO = getIO;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const socket_io_1 = require("socket.io");
const load_env_1 = require("./load-env");
const redis_1 = require("./redis");
(0, load_env_1.loadEnv)();
let io = null;
let bridgeReady = false;
const SOCKET_EVENTS_CHANNEL = 'socket_events';
async function ensureBridge() {
    if (bridgeReady || !io)
        return;
    const subscriber = redis_1.redis.duplicate();
    await subscriber.subscribe(SOCKET_EVENTS_CHANNEL);
    subscriber.on('message', (channel, raw) => {
        if (channel !== SOCKET_EVENTS_CHANNEL || !io)
            return;
        try {
            const message = JSON.parse(raw);
            io.to(message.room).emit(message.event, message.payload);
        }
        catch (error) {
            console.error('[Socket.IO] Failed to relay pub/sub message:', error);
        }
    });
    subscriber.on('error', (error) => {
        console.error('[Socket.IO] Pub/sub bridge error:', error);
    });
    bridgeReady = true;
}
function readSocketUser(token) {
    if (!token)
        return null;
    const secret = process.env.JWT_SECRET;
    if (!secret)
        return null;
    try {
        const payload = jsonwebtoken_1.default.verify(token, secret);
        const userId = payload.id ?? payload.sub;
        if (!userId)
            return null;
        return {
            id: userId,
            agencyId: payload.agencyId ?? payload.agency_id ?? null,
        };
    }
    catch {
        return null;
    }
}
async function initSocketIO(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: { origin: '*' }, // tighten in production
        path: '/socket.io',
    });
    await ensureBridge();
    io.on('connection', (socket) => {
        const token = socket.handshake.auth?.token;
        const user = readSocketUser(token);
        if (user?.id) {
            socket.join(`user:${user.id}`);
            if (user.agencyId) {
                socket.join(`agency:${user.agencyId}`);
            }
            console.log(`[Socket.IO] User ${user.id} connected (socket ${socket.id})`);
        }
        const tripId = socket.handshake.query?.tripId;
        if (typeof tripId === 'string' && tripId) {
            socket.join(`trip:${tripId}`);
        }
        socket.on('join_trip', (payload) => {
            if (typeof payload?.tripId !== 'string' || !payload.tripId)
                return;
            socket.join(`trip:${payload.tripId}`);
        });
        socket.on('disconnect', () => {
            console.log(`[Socket.IO] Socket ${socket.id} disconnected`);
        });
    });
    return io;
}
async function emitSocketEvent(room, event, payload) {
    if (io) {
        io.to(room).emit(event, payload);
        return;
    }
    await redis_1.redis.publish(SOCKET_EVENTS_CHANNEL, JSON.stringify({ room, event, payload }));
}
function getIO() {
    if (!io) {
        throw new Error('[Socket.IO] Not initialized — call initSocketIO(httpServer) in server.ts first');
    }
    return io;
}
