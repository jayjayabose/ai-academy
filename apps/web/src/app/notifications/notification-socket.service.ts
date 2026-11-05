import { Injectable, InjectionToken, effect, inject, signal, untracked } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Socket, io } from 'socket.io-client';

import type {
  AppNotification,
  NotificationServerToClientEvents,
  NotificationSocketAuth,
  UnreadCountResponse,
} from '@ai-academy/shared';

import { AuthSession } from '../core/auth/auth-session';

export type NotificationSocket = Socket<NotificationServerToClientEvents>;

/** Opens the connection. A token so tests can hand the service a fake socket instead of a network. */
export type NotificationSocketFactory = (auth: NotificationSocketAuth) => NotificationSocket;

/**
 * Same origin, no URL: the dev proxy forwards `/api` (ws: true) and the server's
 * path lives under it, because Socket.io's default `/socket.io` would 404 through
 * the proxy. The namespace is the first argument.
 */
export const NOTIFICATION_SOCKET_FACTORY = new InjectionToken<NotificationSocketFactory>(
  'NOTIFICATION_SOCKET_FACTORY',
  {
    providedIn: 'root',
    factory: () => (auth) => io('/notifications', { path: '/api/socket.io', auth }),
  },
);

/**
 * The one socket for this tab. It follows the session: connects when
 * `isAuthenticated()` turns true, disconnects on sign-out, and reconnects with the
 * new token if the token changes while signed in.
 *
 * The service only relays; what the events mean for the UI is NotificationService's job.
 */
@Injectable({ providedIn: 'root' })
export class NotificationSocketService {
  private readonly session = inject(AuthSession);
  private readonly createSocket = inject(NOTIFICATION_SOCKET_FACTORY);

  private socket: NotificationSocket | null = null;
  private connectedToken: string | null = null;

  private readonly notificationSubject = new Subject<AppNotification>();
  private readonly unreadCountSubject = new Subject<UnreadCountResponse>();
  private readonly connectedState = signal(false);

  /** A new notification was persisted for this user. */
  readonly notification$: Observable<AppNotification> = this.notificationSubject.asObservable();
  /** The unread count changed. */
  readonly unreadCount$: Observable<UnreadCountResponse> = this.unreadCountSubject.asObservable();
  /** True while the socket is connected. Becomes true again after every reconnect. */
  readonly connected = this.connectedState.asReadonly();

  constructor() {
    effect(() => {
      const authenticated = this.session.isAuthenticated();
      const token = this.session.token();
      untracked(() => {
        if (authenticated && token) {
          this.connect(token);
        } else {
          this.disconnect();
        }
      });
    });
  }

  private connect(token: string): void {
    if (this.socket && this.connectedToken === token) return;
    this.disconnect();

    const socket = this.createSocket({ token });
    this.socket = socket;
    this.connectedToken = token;

    socket.on('connect', () => this.connectedState.set(true));
    socket.on('disconnect', () => this.connectedState.set(false));
    socket.on('notification', (notification) => this.notificationSubject.next(notification));
    socket.on('unread-count', (payload) => this.unreadCountSubject.next(payload));
  }

  private disconnect(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.connectedToken = null;
    this.connectedState.set(false);
  }
}
