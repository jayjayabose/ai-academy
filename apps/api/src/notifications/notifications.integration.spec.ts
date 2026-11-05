import type {
  AppNotification,
  CreateLeadRequest,
  Lead as LeadResource,
  NotificationServerToClientEvents,
  UnreadCountResponse,
} from '@ai-academy/shared';
import { type INestApplication, Logger } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import { testDatabaseOptions, truncateAll } from '@test/helpers';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { type Socket, io } from 'socket.io-client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp } from '../common/configure-app';
import { InteractionsModule } from '../interactions/interactions.module';
import { LeadsModule } from '../leads/leads.module';
import { NotificationsModule } from './notifications.module';
import { NotificationsService } from './notifications.service';

/**
 * No mocks: real Postgres, a real Nest app listening on an ephemeral port, real
 * socket.io-client connections through the real gateway. The only seam is the
 * token verifier, which is the Phase 0 stub (`dev-token-<user-uuid>`).
 *
 * The failing-notifier test is the single exception, and it replaces one method
 * on the real service for one call — see its comment.
 */

type ClientSocket = Socket<NotificationServerToClientEvents>;

const ABSENT_ID = '11111111-1111-4111-8111-111111111111';

const LEAD: CreateLeadRequest = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
};

describe('notifications over HTTP and Socket.io', () => {
  let app: INestApplication;
  let http: App;
  let sequelize: Sequelize;
  let baseUrl: string;
  const sockets: ClientSocket[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        SequelizeModule.forRoot(testDatabaseOptions()),
        LeadsModule,
        InteractionsModule,
        NotificationsModule,
      ],
    }).compile();

    app = configureApp(moduleRef.createNestApplication());
    await app.listen(0, '127.0.0.1');
    const server = app.getHttpServer() as Server;
    http = server;
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    sequelize = app.get(Sequelize);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAll(sequelize);
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) socket.disconnect();
  });

  it('refuses a handshake with an invalid token, as connect_error Unauthorized', async () => {
    const socket = open('not-a-token');

    const error = await new Promise<Error>((resolve) =>
      socket.once('connect_error', resolve),
    );

    expect(error.message).toBe('Unauthorized');
    expect(socket.connected).toBe(false);
  });

  it('refuses a handshake with no token', async () => {
    const socket = open(undefined);

    const error = await new Promise<Error>((resolve) =>
      socket.once('connect_error', resolve),
    );

    expect(error.message).toBe('Unauthorized');
  });

  it('delivers a lead_created notification to every connected user and persists one row each', async () => {
    const x = await insertUser('x@dev.local');
    const y = await insertUser('y@dev.local');
    const socketX = await connected(x);
    const socketY = await connected(y);
    const gotX = nextEvent(socketX, 'notification');
    const gotY = nextEvent(socketY, 'notification');

    const created = await postLead();

    expect(created.status).toBe(201);
    const [nx, ny] = await Promise.all([gotX, gotY]);
    expect(nx).toMatchObject({
      type: 'lead_created',
      userId: x,
      leadId: created.body.id,
      title: 'New lead',
      message: 'Ada Lovelace was added',
      isRead: false,
    });
    expect(ny).toMatchObject({ userId: y, leadId: created.body.id });
    expect(await rowCount(x)).toBe(1);
    expect(await rowCount(y)).toBe(1);
  });

  it('emits unread-count right after the notification', async () => {
    const x = await insertUser('x@dev.local');
    const socket = await connected(x);
    const events: string[] = [];
    socket.on('notification', () => events.push('notification'));
    const count = nextEvent(socket, 'unread-count');
    socket.on('unread-count', () => events.push('unread-count'));

    await postLead();

    expect(await count).toEqual({ count: 1 });
    expect(events).toEqual(['notification', 'unread-count']);
  });

  it('does not deliver to a user whose socket is not in the recipient room', async () => {
    const x = await insertUser('x@dev.local');
    const socketX = await connected(x);
    const received: AppNotification[] = [];
    socketX.on('notification', (n) => received.push(n));

    await postLead();
    await eventually(() => expect(received).toHaveLength(1));

    expect(received.every((n) => n.userId === x)).toBe(true);
  });

  describe('REST', () => {
    it('answers 401 without a token and 401 for a bad one', async () => {
      expect((await request(http).get('/api/notifications')).status).toBe(401);
      expect((await get('/api/notifications', 'dev-token-nope')).status).toBe(
        401,
      );
    });

    it('lists newest first, honours limit, and is scoped to the caller', async () => {
      const x = await insertUser('x@dev.local');
      const y = await insertUser('y@dev.local');
      await postLead({ ...LEAD, firstName: 'First' });
      await postLead({ ...LEAD, firstName: 'Second' });

      const all = await get('/api/notifications', tokenFor(x));
      const one = await get('/api/notifications?limit=1', tokenFor(x));
      const tooMany = await get('/api/notifications?limit=101', tokenFor(x));

      const list = all.body as AppNotification[];
      expect(list.map((n) => n.message)).toEqual([
        'Second Lovelace was added',
        'First Lovelace was added',
      ]);
      expect(list.every((n) => n.userId === x)).toBe(true);
      expect(one.body).toHaveLength(1);
      expect(tooMany.status).toBe(400);
      expect(await rowCount(y)).toBe(2);
    });

    it('does not let one user read, mark or delete another user notification (404)', async () => {
      const x = await insertUser('x@dev.local');
      const y = await insertUser('y@dev.local');
      await postLead();
      const [xs] = await listFor(x);

      const asY = tokenFor(y);
      expect(
        (await patch(`/api/notifications/${xs.id}/read`, asY)).status,
      ).toBe(404);
      expect(
        (await patch(`/api/notifications/${xs.id}/unread`, asY)).status,
      ).toBe(404);
      expect((await del(`/api/notifications/${xs.id}`, asY)).status).toBe(404);
      expect(
        (await patch(`/api/notifications/${ABSENT_ID}/read`, asY)).status,
      ).toBe(404);

      // Still there and still unread for its owner.
      expect(await listFor(x)).toMatchObject([{ id: xs.id, isRead: false }]);
    });

    it('rejects a malformed id with 400 rather than reaching the database', async () => {
      const x = await insertUser('x@dev.local');

      expect(
        (await patch('/api/notifications/nope/read', tokenFor(x))).status,
      ).toBe(400);
    });

    it('marks read, unread and deletes, keeping unread-count in step', async () => {
      const x = await insertUser('x@dev.local');
      await postLead();
      const [n] = await listFor(x);
      const token = tokenFor(x);

      expect(
        (await get('/api/notifications/unread-count', token)).body,
      ).toEqual({ count: 1 });

      const read = await patch(`/api/notifications/${n.id}/read`, token);
      expect(read.status).toBe(200);
      expect((read.body as AppNotification).isRead).toBe(true);
      expect(
        (await get('/api/notifications/unread-count', token)).body,
      ).toEqual({ count: 0 });

      const unread = await patch(`/api/notifications/${n.id}/unread`, token);
      expect((unread.body as AppNotification).isRead).toBe(false);
      expect(
        (await get('/api/notifications/unread-count', token)).body,
      ).toEqual({ count: 1 });

      expect((await del(`/api/notifications/${n.id}`, token)).status).toBe(204);
      expect(await listFor(x)).toEqual([]);
      expect(
        (await get('/api/notifications/unread-count', token)).body,
      ).toEqual({ count: 0 });
    });
  });

  describe('unread-count events', () => {
    it('fires after mark-read, mark-unread and delete', async () => {
      const x = await insertUser('x@dev.local');
      const socket = await connected(x);
      await postLead();
      const [n] = await listFor(x);
      const token = tokenFor(x);

      const afterRead = nextEvent(socket, 'unread-count');
      await patch(`/api/notifications/${n.id}/read`, token);
      expect(await afterRead).toEqual({ count: 0 });

      const afterUnread = nextEvent(socket, 'unread-count');
      await patch(`/api/notifications/${n.id}/unread`, token);
      expect(await afterUnread).toEqual({ count: 1 });

      const afterDelete = nextEvent(socket, 'unread-count');
      await del(`/api/notifications/${n.id}`, token);
      expect(await afterDelete).toEqual({ count: 0 });
    });

    it('PATCH /read-all answers count 0 and emits it, for the caller only', async () => {
      const x = await insertUser('x@dev.local');
      const y = await insertUser('y@dev.local');
      await postLead();
      await postLead({ ...LEAD, firstName: 'Grace' });
      const socketX = await connected(x);
      const socketY = await connected(y);
      const yEvents: UnreadCountResponse[] = [];
      socketY.on('unread-count', (p) => yEvents.push(p));
      const afterReadAll = nextEvent(socketX, 'unread-count');

      const res = await patch('/api/notifications/read-all', tokenFor(x));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 0 });
      expect(await afterReadAll).toEqual({ count: 0 });
      expect(
        (await get('/api/notifications/unread-count', tokenFor(y))).body,
      ).toEqual({ count: 2 });
      expect(yEvents).toEqual([]);
    });
  });

  describe('when notifying fails', () => {
    it('still answers 201 and keeps the lead', async () => {
      await insertUser('x@dev.local');
      // The one deliberate fake: the real service rejects for exactly one call, the way
      // a database outage between the lead commit and the fan-out would.
      jest
        .spyOn(app.get(NotificationsService), 'notifyAllUsers')
        .mockRejectedValueOnce(new Error('notifier is down'));
      const logged = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      const created = await postLead();

      expect(created.status).toBe(201);
      const [{ count }] = await sequelize.query<{ count: string }>(
        'SELECT count(*) AS count FROM leads WHERE id = :id',
        { replacements: { id: created.body.id }, type: QueryTypes.SELECT },
      );
      expect(count).toBe('1');
      expect(logged).toHaveBeenCalledWith(
        expect.stringContaining('Could not notify'),
        expect.any(String),
      );
      logged.mockRestore();
    });
  });

  // -- helpers (plumbing, not specification) ---------------------------------

  function tokenFor(userId: string): string {
    return `dev-token-${userId}`;
  }

  function open(token: string | undefined): ClientSocket {
    const socket: ClientSocket = io(`${baseUrl}/notifications`, {
      path: '/api/socket.io',
      transports: ['websocket'],
      reconnection: false,
      auth: token === undefined ? {} : { token },
    });
    sockets.push(socket);
    return socket;
  }

  async function connected(userId: string): Promise<ClientSocket> {
    const socket = open(tokenFor(userId));
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    return socket;
  }

  function nextEvent<E extends keyof NotificationServerToClientEvents>(
    socket: ClientSocket,
    event: E,
  ): Promise<Parameters<NotificationServerToClientEvents[E]>[0]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`no "${event}" event within 3s`)),
        3000,
      );
      socket.once(event, ((payload: never) => {
        clearTimeout(timer);
        resolve(payload);
      }) as never);
    });
  }

  async function postLead(
    body: CreateLeadRequest = LEAD,
  ): Promise<{ status: number; body: LeadResource }> {
    const res = await request(http).post('/api/leads').send(body);
    return { status: res.status, body: res.body as LeadResource };
  }

  const get = (path: string, token: string) =>
    request(http).get(path).set('Authorization', `Bearer ${token}`);
  const patch = (path: string, token: string) =>
    request(http).patch(path).set('Authorization', `Bearer ${token}`);
  const del = (path: string, token: string) =>
    request(http).delete(path).set('Authorization', `Bearer ${token}`);

  async function listFor(userId: string): Promise<AppNotification[]> {
    return (await get('/api/notifications', tokenFor(userId)))
      .body as AppNotification[];
  }

  /** Raw SQL: the users table has no model on this branch. */
  async function insertUser(email: string): Promise<string> {
    const rows = await sequelize.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, first_name, last_name)
           VALUES (:email, 'x', 'Test', 'User') RETURNING id`,
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    return rows[0].id;
  }

  async function rowCount(userId: string): Promise<number> {
    const [{ count }] = await sequelize.query<{ count: string }>(
      'SELECT count(*) AS count FROM notifications WHERE user_id = :userId',
      { replacements: { userId }, type: QueryTypes.SELECT },
    );
    return Number(count);
  }
});

async function eventually(
  assertion: () => void,
  timeoutMs = 3000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise((r) => setTimeout(r, 25));
    }
  }
}
