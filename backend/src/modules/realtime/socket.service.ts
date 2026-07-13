/**
 * Socket.IO Real-time Service
 *
 * Singleton that owns the Socket.IO server. Controllers call the emit helpers
 * after successful mutations; connected clients on Web/Android/iOS receive the
 * event and refresh their local state without a manual page reload.
 *
 * Rooms
 * ─────
 *   user:<userId>      personal room — cart, orders, profile, quotations
 *   role:<ROLE>        broadcast to every session with that role (ADMIN, SUPER_ADMIN …)
 *
 * Auth
 * ────
 *   Clients must send a valid JWT in socket.handshake.auth.token.
 *   Invalid / missing tokens are rejected at connect-time (no room join).
 */

import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '@/config/jwt';
import { logger } from '@/common/logger/logger';
import { env } from '@/config/env';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RealtimeEvent =
  // Cart
  | 'cart:updated'
  // Orders
  | 'order:created'
  | 'order:updated'
  // Profile
  | 'profile:updated'
  // Quotations
  | 'quotation:created'
  | 'quotation:updated'
  // Admin — products / categories / subcategories
  | 'product:created'
  | 'product:updated'
  | 'product:deleted'
  | 'category:created'
  | 'category:updated'
  | 'category:deleted'
  | 'subcategory:created'
  | 'subcategory:updated'
  | 'subcategory:deleted'
  // Notifications
  | 'notification:new'
  // Settings / public content
  | 'settings:updated'
  | 'privacy-policy:updated';

// ─── Singleton ────────────────────────────────────────────────────────────────

let io: Server | null = null;

// ─── Init ────────────────────────────────────────────────────────────────────

export function initSocketServer(httpServer: HttpServer): Server {
  if (io) return io;

  const frontendUrl = env.cors.frontendUrl;

  io = new Server(httpServer, {
    cors: {
      // Allow the configured frontend + any Vercel preview URL + no-origin (mobile)
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (origin === frontendUrl) return cb(null, true);
        if (origin.endsWith('.vercel.app')) return cb(null, true);
        if (!env.isProduction) return cb(null, true); // permissive in dev
        logger.warn('[socket] CORS rejected', { origin });
        cb(new Error('Socket.IO: origin not allowed'));
      },
      credentials: true,
    },
    // Use both WebSocket and polling so mobile clients on restrictive networks work
    transports: ['websocket', 'polling'],
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use((socket: Socket, next) => {
    const token =
      (socket.handshake.auth as Record<string, string>)?.token ||
      (socket.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');

    if (!token) {
      logger.warn('[socket] Connection rejected — no token', { id: socket.id });
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      (socket as any).role = payload.role;
      next();
    } catch {
      logger.warn('[socket] Connection rejected — invalid token', { id: socket.id });
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const userId: string = (socket as any).userId;
    const role: string = (socket as any).role;

    // Join personal room and role room
    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);

    logger.info('[socket] Client connected', { socketId: socket.id, userId, role });

    socket.on('disconnect', (reason) => {
      logger.info('[socket] Client disconnected', { socketId: socket.id, userId, reason });
    });
  });

  logger.info('[socket] Socket.IO server initialized');
  return io;
}

// ─── Emit helpers ────────────────────────────────────────────────────────────

/** Emit to every session belonging to one user (across all devices). */
export function emitToUser(userId: string, event: RealtimeEvent, data?: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data ?? null);
}

/** Emit to every connected client that holds a given role. */
export function emitToRole(role: string, event: RealtimeEvent, data?: unknown): void {
  if (!io) return;
  io.to(`role:${role}`).emit(event, data ?? null);
}

/** Emit to ALL connected clients (public content changes, settings …). */
export function emitToAll(event: RealtimeEvent, data?: unknown): void {
  if (!io) return;
  io.emit(event, data ?? null);
}

/** Returns the Socket.IO server instance (or null if not yet initialized). */
export function getSocketServer(): Server | null {
  return io;
}
