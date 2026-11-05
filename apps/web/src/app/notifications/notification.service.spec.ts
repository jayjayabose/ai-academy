import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AppNotification } from '@ai-academy/shared';

import { AuthSession } from '../core/auth/auth-session';
import { NOTIFICATION_SOCKET_FACTORY } from './notification-socket.service';
import { NotificationService } from './notification.service';
import { FakeAuthSession, FakeSocket } from './notification-test-doubles';

function make(id: string, isRead = false): AppNotification {
  return {
    id,
    userId: 'u1',
    type: 'lead_created',
    title: 'New lead',
    message: `Lead ${id} was added`,
    isRead,
    leadId: `lead-${id}`,
    createdAt: '2026-11-05T10:00:00.000Z',
  };
}

describe('NotificationService', () => {
  let session: FakeAuthSession;
  let socket: FakeSocket;
  let http: HttpTestingController;
  let service: NotificationService;

  /** Signs in, lets the socket "connect", and answers the history load. */
  async function connectWith(list: AppNotification[], count: number): Promise<void> {
    session.signIn('dev-token-1');
    TestBed.tick();
    socket.fire('connect');
    TestBed.tick();
    http.expectOne('/api/notifications').flush(list);
    http.expectOne('/api/notifications/unread-count').flush({ count });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  beforeEach(() => {
    session = new FakeAuthSession();
    socket = new FakeSocket();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthSession, useValue: session },
        { provide: NOTIFICATION_SOCKET_FACTORY, useValue: () => socket.asSocket() },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(NotificationService);
    TestBed.tick();
  });

  afterEach(() => http.verify());

  it('loads the history and the badge once the socket connects', async () => {
    await connectWith([make('a'), make('b', true)], 1);

    expect(service.notifications().map((n) => n.id)).toEqual(['a', 'b']);
    expect(service.unreadCount()).toBe(1);
  });

  it('sends the bearer token on its requests', async () => {
    session.signIn('dev-token-xyz');
    TestBed.tick();
    socket.fire('connect');
    TestBed.tick();

    const req = http.expectOne('/api/notifications');
    expect(req.request.headers.get('Authorization')).toBe('Bearer dev-token-xyz');
    req.flush([]);
    http.expectOne('/api/notifications/unread-count').flush({ count: 0 });
  });

  it('prepends a live notification, announces it, and takes the count from the server event', async () => {
    await connectWith([make('a')], 1);
    const incoming: string[] = [];
    service.incoming$.subscribe((n) => incoming.push(n.id));

    socket.fire('notification', make('b'));
    socket.fire('unread-count', { count: 2 });

    expect(service.notifications().map((n) => n.id)).toEqual(['b', 'a']);
    expect(service.unreadCount()).toBe(2);
    expect(incoming).toEqual(['b']);
  });

  it('does not duplicate a notification it already has', async () => {
    await connectWith([make('a')], 1);

    socket.fire('notification', make('a'));

    expect(service.notifications()).toHaveLength(1);
  });

  it('marks read through the API and lowers the badge', async () => {
    await connectWith([make('a')], 1);

    const done = service.markRead('a');
    const req = http.expectOne('/api/notifications/a/read');
    expect(req.request.method).toBe('PATCH');
    req.flush(make('a', true));
    await done;
    socket.fire('unread-count', { count: 0 });

    expect(service.notifications()[0].isRead).toBe(true);
    expect(service.unreadCount()).toBe(0);
  });

  it('does not count a change twice when the server event beats the HTTP response', async () => {
    await connectWith([make('a'), make('b')], 2);

    const done = service.markRead('a');
    socket.fire('unread-count', { count: 1 });
    http.expectOne('/api/notifications/a/read').flush(make('a', true));
    await done;

    expect(service.unreadCount()).toBe(1);
  });

  it('adjusts the badge itself while the socket is down', async () => {
    await connectWith([make('a'), make('b')], 2);
    socket.fire('disconnect');
    TestBed.tick();

    const done = service.markRead('a');
    http.expectOne('/api/notifications/a/read').flush(make('a', true));
    await done;

    expect(service.unreadCount()).toBe(1);
  });

  it('marks unread through the API and raises the badge', async () => {
    await connectWith([make('a', true)], 0);

    const done = service.markUnread('a');
    http.expectOne('/api/notifications/a/unread').flush(make('a', false));
    await done;
    socket.fire('unread-count', { count: 1 });

    expect(service.notifications()[0].isRead).toBe(false);
    expect(service.unreadCount()).toBe(1);
  });

  it('marks everything read and zeroes the badge', async () => {
    await connectWith([make('a'), make('b')], 2);

    const done = service.markAllRead();
    const req = http.expectOne('/api/notifications/read-all');
    expect(req.request.method).toBe('PATCH');
    req.flush({ count: 0 });
    await done;

    expect(service.notifications().every((n) => n.isRead)).toBe(true);
    expect(service.unreadCount()).toBe(0);
  });

  it('deletes an unread item and lowers the badge, but not for a read one', async () => {
    await connectWith([make('a'), make('b', true)], 1);

    const first = service.remove('b');
    http.expectOne('/api/notifications/b').flush(null, { status: 204, statusText: 'No Content' });
    await first;
    socket.fire('unread-count', { count: 1 });
    expect(service.unreadCount()).toBe(1);

    const second = service.remove('a');
    const req = http.expectOne('/api/notifications/a');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await second;
    socket.fire('unread-count', { count: 0 });

    expect(service.notifications()).toEqual([]);
    expect(service.unreadCount()).toBe(0);
  });

  it('clears everything on sign-out', async () => {
    await connectWith([make('a')], 1);

    session.signOut();
    TestBed.tick();

    expect(service.notifications()).toEqual([]);
    expect(service.unreadCount()).toBe(0);
  });

  it('keeps what it has when a refresh fails', async () => {
    await connectWith([make('a')], 1);

    const done = service.refresh();
    http.expectOne('/api/notifications').flush('x', { status: 500, statusText: 'Server Error' });
    http.expectOne('/api/notifications/unread-count').flush('x', {
      status: 500,
      statusText: 'Server Error',
    });
    await done;

    expect(service.notifications()).toHaveLength(1);
  });
});
