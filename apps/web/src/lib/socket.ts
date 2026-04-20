/**
 * Socket.IO client singleton — Sprint 7
 * Connects using the access_token stored in localStorage.
 */
'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(tripId?: string): Socket {
  if (socket?.connected) return socket;

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token')
    : '';

  socket = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000', {
    path: '/socket.io',
    transports: ['websocket'],
    auth: { token },
    query: tripId ? { tripId } : undefined,
    reconnection: true,
    reconnectionAttempts: 999,
    reconnectionDelay: 2000,
  });

  socket.on('connect',    () => console.log('[Socket] Connected'));
  socket.on('disconnect', () => console.log('[Socket] Disconnected'));

  return socket;
}

export function joinTrip(tripId: string) {
  const s = getSocket(tripId);
  s.emit('join_trip', { tripId });
}

export function disconnect() {
  socket?.disconnect();
  socket = null;
}
