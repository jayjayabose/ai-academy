import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import type { AppNotification } from '@ai-academy/shared';

import { AuthSession } from '../../core/auth/auth-session';
import { NotificationService } from '../notification.service';
import { badgeLabel, relativeTime } from '../relative-time';

/** How long a toast stays before it hides itself. */
export const TOAST_DURATION_MS = 5000;

interface Toast {
  /** Own id, not the notification's: the same notification can only toast once, but this keeps `track` honest. */
  key: number;
  notification: AppNotification;
}

/**
 * The header bell: unread badge, history dropdown, and the toast stack.
 *
 * One component for all three because the app header has one slot for it, so the
 * toasts are `position: fixed` and escape the header visually. Everything is
 * hidden while signed out.
 */
@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
})
export class NotificationBell {
  private readonly service = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly session = inject(AuthSession);

  protected readonly notifications = this.service.notifications;
  protected readonly open = signal(false);
  protected readonly toasts = signal<Toast[]>([]);
  /** Frozen when the dropdown opens: relative times are not live-updating, and that is fine. */
  protected readonly now = signal(new Date());

  protected readonly badge = computed(() => badgeLabel(this.service.unreadCount()));
  protected readonly bellLabel = computed(() => {
    const count = this.service.unreadCount();
    return count === 0 ? 'Notifications' : `Notifications, ${count} unread`;
  });

  private nextKey = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor() {
    const subscription = this.service.incoming$.subscribe((notification) =>
      this.showToast(notification),
    );
    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      for (const timer of this.timers.values()) clearTimeout(timer);
      this.timers.clear();
    });
  }

  protected toggle(): void {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    this.now.set(new Date());
    this.open.set(true);
    // Another tab may have changed things; a stale unread style is worse than one request.
    void this.service.refresh();
  }

  @HostListener('document:keydown.escape')
  protected close(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected closeOnOutsideClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  protected timeAgo(notification: AppNotification): string {
    return relativeTime(notification.createdAt, this.now());
  }

  /** Dropdown item or toast body: mark read, and go to the lead when there is one. */
  protected activate(notification: AppNotification): void {
    if (!notification.isRead) void this.service.markRead(notification.id).catch(() => undefined);
    if (notification.leadId) {
      this.open.set(false);
      void this.router.navigate(['/leads', notification.leadId]);
    }
  }

  protected activateToast(toast: Toast): void {
    this.dismissToast(toast.key);
    this.activate(toast.notification);
  }

  protected dismissToast(key: number): void {
    const timer = this.timers.get(key);
    if (timer !== undefined) clearTimeout(timer);
    this.timers.delete(key);
    this.toasts.update((list) => list.filter((t) => t.key !== key));
  }

  protected markUnread(notification: AppNotification): void {
    void this.service.markUnread(notification.id).catch(() => undefined);
  }

  protected markRead(notification: AppNotification): void {
    void this.service.markRead(notification.id).catch(() => undefined);
  }

  protected remove(notification: AppNotification): void {
    void this.service.remove(notification.id).catch(() => undefined);
  }

  protected markAllRead(): void {
    void this.service.markAllRead().catch(() => undefined);
  }

  private showToast(notification: AppNotification): void {
    const key = this.nextKey++;
    this.toasts.update((list) => [...list, { key, notification }]);
    this.timers.set(
      key,
      setTimeout(() => this.dismissToast(key), TOAST_DURATION_MS),
    );
  }
}
