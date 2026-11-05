import type {
  AuthResponse,
  Lead as LeadResource,
  RegisterRequest,
  User as UserResource,
} from '@ai-academy/shared';
import type { INestApplication } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import { testDatabaseOptions, truncateAll } from '@test/helpers';
import { Sequelize } from 'sequelize-typescript';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp } from '../common/configure-app';
import { RootConfigModule } from '../config/root-config';
import { HealthModule } from '../health/health.module';
import { InteractionsModule } from '../interactions/interactions.module';
import { LeadsModule } from '../leads/leads.module';
import { AuthModule } from './auth.module';

/**
 * No mocks: real Postgres, real bcrypt, real JWT, real global guard.
 * Built with configureApp(), the same function main.ts calls.
 */

const ADA: RegisterRequest = {
  email: 'ada@example.com',
  password: 'correct-horse',
  firstName: 'Ada',
  lastName: 'Lovelace',
};

describe('authentication, over HTTP against Postgres', () => {
  let app: INestApplication;
  let http: App;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        RootConfigModule,
        SequelizeModule.forRoot(testDatabaseOptions()),
        AuthModule,
        HealthModule,
        LeadsModule,
        InteractionsModule,
      ],
    }).compile();

    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAll(app.get(Sequelize));
  });

  const register = (body: object = ADA) =>
    request(http).post('/api/auth/register').send(body);

  async function registerAda(): Promise<AuthResponse> {
    const response = await register();
    return response.body as AuthResponse;
  }

  describe('register -> login -> me', () => {
    it('registers, logs in and resolves the same user from the returned token', async () => {
      const registered = await register();

      expect(registered.status).toBe(201);
      const created = registered.body as AuthResponse;
      expect(typeof created.token).toBe('string');
      expect(created.user).toMatchObject({
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
      expect(JSON.stringify(registered.body)).not.toMatch(/passwordHash|hash/i);

      const loggedIn = await request(http)
        .post('/api/auth/login')
        .send({ email: ADA.email, password: ADA.password });
      expect(loggedIn.status).toBe(200);
      const { token } = loggedIn.body as AuthResponse;

      const me = await request(http)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(me.status).toBe(200);
      expect(me.body as UserResource).toEqual(created.user);
    });

    it('stores a bcrypt hash, never the password', async () => {
      await register();

      const [rows] = await app
        .get(Sequelize)
        .query(
          `SELECT password_hash FROM users WHERE email = 'ada@example.com'`,
        );
      const hash = (rows as { password_hash: string }[])[0].password_hash;
      expect(hash).toMatch(/^\$2[aby]\$10\$/);
      expect(hash).not.toContain(ADA.password);
    });

    it('lowercases and trims the email, and logs in with any casing', async () => {
      const registered = await register({
        ...ADA,
        email: '  ADA@Example.com ',
      });
      expect((registered.body as AuthResponse).user.email).toBe(
        'ada@example.com',
      );

      const login = await request(http)
        .post('/api/auth/login')
        .send({ email: 'Ada@EXAMPLE.com', password: ADA.password });
      expect(login.status).toBe(200);
    });
  });

  describe('register', () => {
    it('answers 409 for a duplicate email, including a different casing', async () => {
      await register();

      expect((await register()).status).toBe(409);
      expect(
        (await register({ ...ADA, email: 'ADA@example.com' })).status,
      ).toBe(409);
    });

    it.each([
      ['a short password', { ...ADA, password: 'short' }],
      ['a malformed email', { ...ADA, email: 'not-an-email' }],
      ['an empty first name', { ...ADA, firstName: '' }],
      ['an unexpected field', { ...ADA, isAdmin: true }],
    ])('answers 400 for %s', async (_label, body) => {
      expect((await register(body)).status).toBe(400);
    });
  });

  describe('login', () => {
    it('answers an identical 401 for a wrong password and an unknown user', async () => {
      await register();

      const wrongPassword = await request(http)
        .post('/api/auth/login')
        .send({ email: ADA.email, password: 'wrong-password' });
      const unknownUser = await request(http)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong-password' });

      expect(wrongPassword.status).toBe(401);
      expect(unknownUser.status).toBe(401);
      expect((wrongPassword.body as { message: string }).message).toBe(
        'Invalid credentials',
      );
      expect(unknownUser.body).toEqual(wrongPassword.body);
    });
  });

  describe('the global guard', () => {
    it('GET /api/auth/me is 401 without a token and with a garbage token', async () => {
      expect((await request(http).get('/api/auth/me')).status).toBe(401);
      expect(
        (
          await request(http)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer not.a.jwt')
        ).status,
      ).toBe(401);
    });

    it('GET /api/leads is 401 without a token and 200 with one', async () => {
      const { token } = await registerAda();

      expect((await request(http).get('/api/leads')).status).toBe(401);

      const authorised = await request(http)
        .get('/api/leads')
        .set('Authorization', `Bearer ${token}`);
      expect(authorised.status).toBe(200);
      expect(authorised.body as LeadResource[]).toEqual([]);
    });

    it('protects interactions too (not only leads)', async () => {
      const res = await request(http).post(
        '/api/leads/11111111-1111-4111-8111-111111111111/interactions',
      );
      expect(res.status).toBe(401);
    });

    it('rejects a token for a user that no longer exists on /me', async () => {
      const { token } = await registerAda();
      await truncateAll(app.get(Sequelize));

      const me = await request(http)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(me.status).toBe(401);
    });

    it('GET /api/health is 200 without a token', async () => {
      const res = await request(http).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });
});
