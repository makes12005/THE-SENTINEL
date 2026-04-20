/**
 * Socket.IO singleton — shared between Fastify server and alert orchestrator.
 *
 * init(httpServer) is called once in server.ts.
 * getIO() is used anywhere else to emit events.
 */

import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'http';

let io: SocketServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: '*' },   // tighten in production
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined;
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[Socket.IO] User ${userId} connected (socket ${socket.id})`);
    }

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Socket ${socket.id} disconnected`);
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error(
      '[Socket.IO] Not initialized — call initSocketIO(httpServer) in server.ts first'
    );
  }
  return io;
}
