import type {
  NotificationServerToClientEvents,
  AppNotification,
  UnreadCountResponse,
} from '@ai-academy/shared';
import { Inject, Logger } from '@nestjs/common';
import {
  type OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { DefaultEventsMap, Namespace, Socket } from 'socket.io';
import {
  type AuthenticatedUser,
  TOKEN_VERIFIER,
  type TokenVerifier,
} from '../auth/auth.contract';

export interface NotificationSocketData {
  user: AuthenticatedUser;
}

export type NotificationNamespace = Namespace<
  DefaultEventsMap,
  NotificationServerToClientEvents,
  DefaultEventsMap,
  NotificationSocketData
>;

type NotificationSocket = Socket<
  DefaultEventsMap,
  NotificationServerToClientEvents,
  DefaultEventsMap,
  NotificationSocketData
>;

/** The one room a user's sockets share. Emitting here reaches every tab and device. */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * The handshake check, as a plain function so it is testable without a server.
 *
 * It runs as NAMESPACE MIDDLEWARE, not in handleConnection: calling
 * `next(new Error(...))` is what makes the client see `connect_error`, whereas
 * closing the socket after it connected would show up as an ordinary disconnect.
 * Every failure collapses to one message so a client cannot tell a missing token
 * from a bad one.
 */
export function authenticateSocket(
  verifier: TokenVerifier,
): (socket: NotificationSocket, next: (err?: Error) => void) => Promise<void> {
  return async (socket, next) => {
    const token: unknown = (socket.handshake.auth as { token?: unknown })
      ?.token;
    if (typeof token !== 'string' || token.length === 0) {
      next(new Error('Unauthorized'));
      return;
    }

    try {
      const user = await verifier.verify(token);
      socket.data.user = user;
      await socket.join(userRoom(user.id));
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  };
}

/**
 * `path` must be under /api: the dev proxy forwards only `/api` (ws: true), and
 * Socket.io's default `/socket.io` would 404 through it.
 */
@WebSocketGateway({ path: '/api/socket.io', namespace: '/notifications' })
export class NotificationsGateway implements OnGatewayInit {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  private server!: NotificationNamespace;

  constructor(
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
  ) {}

  afterInit(server: NotificationNamespace): void {
    server.use((socket, next) => {
      void authenticateSocket(this.verifier)(socket, next);
    });
  }

  emitNotification(userId: string, notification: AppNotification): void {
    this.server.to(userRoom(userId)).emit('notification', notification);
  }

  emitUnreadCount(userId: string, payload: UnreadCountResponse): void {
    this.server.to(userRoom(userId)).emit('unread-count', payload);
  }
}
