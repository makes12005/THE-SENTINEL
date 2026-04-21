/**
 * Socket.IO singleton — shared between Fastify server and background workers.
 *
 * init(httpServer) is called once in server.ts.
 * emitSocketEvent() is safe in worker processes because it falls back to
 * Redis pub/sub when the local Socket.IO server is not running.
 */

import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server as SocketServer } from 'socket.io';
import { loadEnv } from './load-env';
import { redis } from './redis';

loadEnv();

let io: SocketServer | null = null;
let bridgeReady = false;
const SOCKET_EVENTS_CHANNEL = 'socket_events';

type SocketAuthPayload = {
  id?: string;
  sub?: string;
  agencyId?: string | null;
  agency_id?: string | null;
};

async function ensureBridge(): Promise<void> {
  if (bridgeReady || !io) return;

  const subscriber = redis.duplicate();
  await subscriber.subscribe(SOCKET_EVENTS_CHANNEL);
  subscriber.on('message', (channel, raw) => {
    if (channel !== SOCKET_EVENTS_CHANNEL || !io) return;

    try {
      const message = JSON.parse(raw) as { room: string; event: string; payload: unknown };
      io.to(message.room).emit(message.event, message.payload);
    } catch (error) {
      console.error('[Socket.IO] Failed to relay pub/sub message:', error);
    }
  });

  subscriber.on('error', (error) => {
    console.error('[Socket.IO] Pub/sub bridge error:', error);
  });

  bridgeReady = true;
}

function readSocketUser(token?: string): { id: string; agencyId: string | null } | null {
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const payload = jwt.verify(token, secret) as SocketAuthPayload;
    const userId = payload.id ?? payload.sub;
    if (!userId) return null;

    return {
      id: userId,
      agencyId: payload.agencyId ?? payload.agency_id ?? null,
    };
  } catch {
    return null;
  }
}

export async function initSocketIO(httpServer: HttpServer): Promise<SocketServer> {
  io = new SocketServer(httpServer, {
    cors: { origin: '*' },   // tighten in production
    path: '/socket.io',
  });

  await ensureBridge();

  io.on('connection', (socket) => {
    const token = socket.handshake.auth?.token as string | undefined;
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

    socket.on('join_trip', (payload: { tripId?: string }) => {
      if (typeof payload?.tripId !== 'string' || !payload.tripId) return;
      socket.join(`trip:${payload.tripId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Socket ${socket.id} disconnected`);
    });
  });

  return io;
}

export async function emitSocketEvent(room: string, event: string, payload: unknown): Promise<void> {
  if (io) {
    io.to(room).emit(event, payload);
    return;
  }

  await redis.publish(
    SOCKET_EVENTS_CHANNEL,
    JSON.stringify({ room, event, payload })
  );
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error(
      '[Socket.IO] Not initialized — call initSocketIO(httpServer) in server.ts first'
    );
  }
  return io;
}
