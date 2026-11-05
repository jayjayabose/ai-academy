import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';
import type { AppNotification } from '@ai-academy/shared';

import { AuthSession } from '../../core/auth/auth-session';
import { NotificationService } from '../notification.service';
import { FakeAuthSession } from '../notification-test-doubles';
import { NotificationBell, TOAST_DURATION_MS } from './notification-bell';

function make(id: string, overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id,
    userId: 'u1',
    type: 'lead_created',
    title: 'New lead',
    message: `Lead ${id} was added`,
    isRead: false,
    leadId: `lead-${id}`,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/** The slice of NotificationService the bell uses, with spies for the actions. */
class FakeNotificationService {
  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly incoming$ = new Subject<AppNotification>();
  readonly refresh = vi.fn().mockResolvedValue(undefined);
  readonly markRead = vi.fn().mockResolvedValue(undefined);
  readonly markUnread = vi.fn().mockResolvedValue(undefined);
  readonly markAllRead = vi.fn().mockResolvedValue(undefined);
  readonly remove = vi.fn().mockResolvedValue(undefined);
}

describe('NotificationBell', () => {
  let fixture: ComponentFixture<NotificationBell>;
  let service: FakeNotificationService;
  let session: FakeAuthSession;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new FakeNotificationService();
    session = new FakeAuthSession();
    session.signIn();
    navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: NotificationService, useValue: service },
        { provide: AuthSession, useValue: session },
        { provide: Router, useValue: { navigate } },
      ],
    });
    fixture = TestBed.createComponent(NotificationBell);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = (selector: string): HTMLElement | null => root().querySelector<HTMLElement>(selector);
  const all = (selector: string): HTMLElement[] =>
    Array.from(root().querySelectorAll<HTMLElement>(selector));
  const text = (selector: string): string => (q(selector)?.textContent ?? '').trim();

  function setCount(count: number): void {
    service.unreadCount.set(count);
    fixture.detectChanges();
  }

  function openDropdown(): void {
    q('.bell__button')!.click();
    fixture.detectChanges();
  }

  function announce(notification: AppNotification): void {
    service.incoming$.next(notification);
    fixture.detectChanges();
  }

  describe('badge', () => {
    it('is hidden at zero', () => {
      expect(q('.bell__badge')).toBeNull();
    });

    it.each([
      [1, '1'],
      [99, '99'],
      [100, '99+'],
      [250, '99+'],
    ])('shows %i as "%s"', (count, label) => {
      setCount(count);
      expect(text('.bell__badge')).toBe(label);
    });

    it('is announced through the button label, not the visual badge', () => {
      setCount(3);
      expect(q('.bell__button')!.getAttribute('aria-label')).toBe('Notifications, 3 unread');
      expect(q('.bell__badge')!.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('signed out', () => {
    it('renders nothing at all', () => {
      session.signOut();
      fixture.detectChanges();

      expect(root().innerHTML.trim()).not.toContain('bell__button');
      expect(q('.toasts')).toBeNull();
    });
  });

  describe('dropdown', () => {
    beforeEach(() => {
      service.notifications.set([
        make('a'),
        make('b', { isRead: true, leadId: null, message: 'No lead here' }),
      ]);
    });

    it('opens, refreshes, and lists items in the given (newest first) order', () => {
      openDropdown();

      expect(service.refresh).toHaveBeenCalled();
      expect(all('.item').map((i) => i.querySelector('.item__message')!.textContent)).toEqual([
        'Lead a was added',
        'No lead here',
      ]);
      expect(q('.bell__button')!.getAttribute('aria-expanded')).toBe('true');
    });

    it('styles unread items only', () => {
      openDropdown();

      const [first, second] = all('.item');
      expect(first.classList).toContain('item--unread');
      expect(second.classList).not.toContain('item--unread');
    });

    it('says so when there is nothing', () => {
      service.notifications.set([]);
      openDropdown();

      expect(text('.dropdown__empty')).toBe('No notifications yet.');
    });

    it('closes on Escape', () => {
      openDropdown();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(q('.dropdown')).toBeNull();
    });

    it('closes on a click outside, not on one inside', () => {
      openDropdown();
      q('.dropdown__title')!.click();
      fixture.detectChanges();
      expect(q('.dropdown')).not.toBeNull();

      document.body.click();
      fixture.detectChanges();
      expect(q('.dropdown')).toBeNull();
    });

    it('marks read, closes and navigates when an item with a lead is clicked', () => {
      openDropdown();

      all('.item__body')[0].click();
      fixture.detectChanges();

      expect(service.markRead).toHaveBeenCalledWith('a');
      expect(navigate).toHaveBeenCalledWith(['/leads', 'lead-a']);
      expect(q('.dropdown')).toBeNull();
    });

    it('does not navigate, or re-mark, an already-read item with no lead', () => {
      openDropdown();

      all('.item__body')[1].click();

      expect(service.markRead).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('marks unread / read and deletes per item', () => {
      openDropdown();
      const [unreadItem, readItem] = all('.item');

      readItem.querySelector<HTMLElement>('.link-button')!.click();
      expect(service.markUnread).toHaveBeenCalledWith('b');

      unreadItem.querySelector<HTMLElement>('.link-button')!.click();
      expect(service.markRead).toHaveBeenCalledWith('a');

      unreadItem.querySelector<HTMLElement>('.link-button--danger')!.click();
      expect(service.remove).toHaveBeenCalledWith('a');
    });

    it('marks all read', () => {
      setCount(1);
      openDropdown();

      q('.dropdown__header .link-button')!.click();

      expect(service.markAllRead).toHaveBeenCalled();
    });
  });

  describe('toasts', () => {
    it('shows one per incoming notification, in an aria-live polite region', () => {
      expect(q('.toasts')!.getAttribute('aria-live')).toBe('polite');

      announce(make('a'));
      announce(make('b'));

      expect(all('.toast')).toHaveLength(2);
      expect(text('.toast__title')).toBe('New lead');
    });

    it('hides itself after 5 seconds', () => {
      announce(make('a'));

      vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
      fixture.detectChanges();
      expect(all('.toast')).toHaveLength(1);

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(all('.toast')).toHaveLength(0);
    });

    it('times each toast from its own arrival', () => {
      announce(make('a'));
      vi.advanceTimersByTime(3000);
      announce(make('b'));

      vi.advanceTimersByTime(2000);
      fixture.detectChanges();
      expect(all('.toast')).toHaveLength(1);
      expect(text('.toast__message')).toBe('Lead b was added');

      vi.advanceTimersByTime(3000);
      fixture.detectChanges();
      expect(all('.toast')).toHaveLength(0);
    });

    it('can be dismissed early', () => {
      announce(make('a'));

      q('.toast__dismiss')!.click();
      fixture.detectChanges();

      expect(all('.toast')).toHaveLength(0);
    });

    it('navigates to the lead on click, marks read, and goes away', () => {
      announce(make('a'));

      q('.toast__body')!.click();
      fixture.detectChanges();

      expect(navigate).toHaveBeenCalledWith(['/leads', 'lead-a']);
      expect(service.markRead).toHaveBeenCalledWith('a');
      expect(all('.toast')).toHaveLength(0);
    });

    it('leaves no timers behind when destroyed', () => {
      announce(make('a'));

      fixture.destroy();

      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
