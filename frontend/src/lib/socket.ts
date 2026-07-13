'use client';

/**
 * Socket.IO client singleton.
 *
 * One persistent connection is shared across the app. The connection is
 * established lazily on the first call to `getSocket()` and reused thereafter.
 *
 * JWT token is read from the Zustand auth store at connect-time.
 * Call `disconnectSocket()` on logout to tear down the connection cleanly.
 */

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ??
  'http://localhost:5000';

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket;

  // If there is a stale disconnected socket, dispose it
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 30_000,
    timeout: 20_000,
    // Don't connect until getSocket is called with a valid token
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getActiveSocket(): Socket | null {
  return socket;
}
