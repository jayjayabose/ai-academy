import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Observable, Subject, firstValueFrom } from 'rxjs';

import type { AppNotification, UnreadCountResponse } from '@ai-academy/shared';

import { AuthSession } from '../core/auth/auth-session';
import { NotificationSocketService } from './notification-socket.service';

/**
 * Notification state for the UI: the history list, the unread count, and the
 * actions on them. REST is the source of truth on load; the socket keeps it live.
 *
 * Requests carry their own bearer header. The auth branch will add an interceptor
 * that does the same; sending it here too is duplicate-but-harmless, and keeps this
 * feature working (and testable) before that branch merges.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSession);
  private readonly socket = inject(NotificationSocketService);

  private readonly notificationList = signal<AppNotification[]>([]);
  private readonly unread = signal(0);
  private readonly incomingSubject = new Subject<AppNotification>();

  /** Newest first. */
  readonly notifications = this.notificationList.asReadonly();
  readonly unreadCount = this.unread.asReadonly();
  /** Each notification that arrives live (not the history load) — what a toast is made from. */
  readonly incoming$: Observable<AppNotification> = this.incomingSubject.asObservable();

  constructor() {
    this.socket.notification$.subscribe((notification) => {
      this.notificationList.update((list) => [
        notification,
        ...list.filter((n) => n.id !== notification.id),
      ]);
      this.incomingSubject.next(notification);
    });
    this.socket.unreadCount$.subscribe(({ count }) => this.unread.set(count));

    // Load history whenever the socket (re)connects: a first connect needs it, and a
    // reconnect needs it for whatever arrived while the socket was down. Clear on sign-out.
    effect(() => {
      const connected = this.socket.connected();
      const authenticated = this.session.isAuthenticated();
      untracked(() => {
        if (!authenticated) this.reset();
        else if (connected) void this.refresh();
      });
    });
  }

  /** Reloads the list and the badge from the API. */
  async refresh(): Promise<void> {
    if (!this.session.token()) return;
    try {
      const [list, count] = await Promise.all([
        firstValueFrom(
          this.http.get<AppNotification[]>('/api/notifications', { headers: this.headers() }),
        ),
        firstValueFrom(
          this.http.get<UnreadCountResponse>('/api/notifications/unread-count', {
            headers: this.headers(),
          }),
        ),
      ]);
      this.notificationList.set(list);
      this.unread.set(count.count);
    } catch {
      // Leave what we have: a failed refresh must not blank a list the user can see.
    }
  }

  async markRead(id: string): Promise<void> {
    await this.setRead(id, 'read');
  }

  async markUnread(id: string): Promise<void> {
    await this.setRead(id, 'unread');
  }

  async markAllRead(): Promise<void> {
    const { count } = await firstValueFrom(
      this.http.patch<UnreadCountResponse>('/api/notifications/read-all', null, {
        headers: this.headers(),
      }),
    );
    this.notificationList.update((list) => list.map((n) => ({ ...n, isRead: true })));
    this.unread.set(count);
  }

  async remove(id: string): Promise<void> {
    const existing = this.notificationList().find((n) => n.id === id);
    await firstValueFrom(
      this.http.delete<void>(`/api/notifications/${encodeURIComponent(id)}`, {
        headers: this.headers(),
      }),
    );
    this.notificationList.update((list) => list.filter((n) => n.id !== id));
    if (existing && !existing.isRead) this.unread.update((n) => Math.max(0, n - 1));
  }

  private async setRead(id: string, action: 'read' | 'unread'): Promise<void> {
    const before = this.notificationList().find((n) => n.id === id);
    const updated = await firstValueFrom(
      this.http.patch<AppNotification>(
        `/api/notifications/${encodeURIComponent(id)}/${action}`,
        null,
        { headers: this.headers() },
      ),
    );
    this.notificationList.update((list) => list.map((n) => (n.id === id ? updated : n)));
    // The server's unread-count event sets the absolute value; this keeps the badge right
    // in the meantime (and when the socket is down).
    if (before && before.isRead !== updated.isRead) {
      this.unread.update((n) => Math.max(0, n + (updated.isRead ? -1 : 1)));
    }
  }

  private reset(): void {
    this.notificationList.set([]);
    this.unread.set(0);
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.session.token() ?? ''}` });
  }
}
