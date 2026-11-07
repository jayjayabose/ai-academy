import { TestBed } from '@angular/core/testing';
import type { AppNotification } from '@ai-academy/shared';

import { AuthSession } from '../core/auth/auth-session';
import {
  NOTIFICATION_SOCKET_FACTORY,
  NotificationSocketService,
} from './notification-socket.service';
import { FakeAuthSession, FakeSocket } from './notification-test-doubles';

const NOTIFICATION: AppNotification = {
  id: 'n1',
  userId: 'u1',
  type: 'lead_created',
  title: 'New lead',
  message: 'Ada Lovelace was added',
  isRead: false,
  leadId: 'l1',
  createdAt: '2026-11-05T10:00:00.000Z',
};

describe('NotificationSocketService', () => {
  let session: FakeAuthSession;
  let sockets: FakeSocket[];
  let authArgs: { token: string }[];
  let service: NotificationSocketService;

  beforeEach(() => {
    session = new FakeAuthSession();
    sockets = [];
    authArgs = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSession, useValue: session },
        {
          provide: NOTIFICATION_SOCKET_FACTORY,
          useValue: (auth: { token: string }) => {
            authArgs.push(auth);
            const socket = new FakeSocket();
            sockets.push(socket);
            return socket.asSocket();
          },
        },
      ],
    });
    service = TestBed.inject(NotificationSocketService);
    TestBed.tick();
  });

  it('stays disconnected while signed out', () => {
    expect(sockets).toHaveLength(0);
    expect(service.connected()).toBe(false);
  });

  it('connects with the session token when the user signs in', () => {
    session.signIn('dev-token-abc');
    TestBed.tick();

    expect(sockets).toHaveLength(1);
    expect(authArgs).toEqual([{ token: 'dev-token-abc' }]);
  });

  it('opens one connection however many times the session is re-read', () => {
    session.signIn('t1');
    TestBed.tick();
    session.token.set('t1');
    TestBed.tick();

    expect(sockets).toHaveLength(1);
  });

  it('tracks the connected signal from connect and disconnect events', () => {
    session.signIn();
    TestBed.tick();

    sockets[0].fire('connect');
    expect(service.connected()).toBe(true);
    sockets[0].fire('disconnect');
    expect(service.connected()).toBe(false);
  });

  it('disconnects on sign-out', () => {
    session.signIn();
    TestBed.tick();
    sockets[0].fire('connect');

    session.signOut();
    TestBed.tick();

    expect(sockets[0].disconnected).toBe(true);
    expect(service.connected()).toBe(false);
  });

  it('reconnects with the new token when the token changes', () => {
    session.signIn('old');
    TestBed.tick();

    session.signIn('new');
    TestBed.tick();

    expect(sockets[0].disconnected).toBe(true);
    expect(sockets).toHaveLength(2);
    expect(authArgs[1]).toEqual({ token: 'new' });
  });

  it('relays notification and unread-count events', () => {
    const received: unknown[] = [];
    service.notification$.subscribe((n) => received.push(n));
    service.unreadCount$.subscribe((c) => received.push(c));
    session.signIn();
    TestBed.tick();

    sockets[0].fire('notification', NOTIFICATION);
    sockets[0].fire('unread-count', { count: 3 });

    expect(received).toEqual([NOTIFICATION, { count: 3 }]);
  });
});
