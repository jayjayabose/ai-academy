import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { AuthResponse, User } from '@ai-academy/shared';

import { AuthService, TOKEN_STORAGE_KEY } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { provideRouter } from '@angular/router';

const ADA: User = { id: 'u1', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' };
const RESPONSE: AuthResponse = { token: 'jwt-token', user: ADA };

describe('AuthService', () => {
  let http: HttpTestingController;

  function create(): AuthService {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => http.verify());

  it('starts signed out when there is no stored token', async () => {
    const service = create();

    await service.restore();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    http.expectNone('/api/auth/me');
  });

  it('login stores the token under auth-token and exposes the user', () => {
    const service = create();

    service.login({ email: ADA.email, password: 'correct-horse' }).subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ email: ADA.email, password: 'correct-horse' });
    req.flush(RESPONSE);

    expect(localStorage.getItem('auth-token')).toBe('jwt-token');
    expect(localStorage.getItem('dev-token')).toBeNull();
    expect(service.token()).toBe('jwt-token');
    expect(service.user()).toEqual(ADA);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('register posts to /api/auth/register and signs in', () => {
    const service = create();
    const body = { ...ADA, password: 'correct-horse' };

    service.register(body).subscribe();
    const req = http.expectOne('/api/auth/register');
    expect(req.request.body).toEqual(body);
    req.flush(RESPONSE);

    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('jwt-token');
  });

  it('a failed login leaves the session signed out', () => {
    const service = create();
    let failed = false;

    service
      .login({ email: ADA.email, password: 'wrong' })
      .subscribe({ error: () => (failed = true) });
    http
      .expectOne('/api/auth/login')
      .flush(
        { statusCode: 401, message: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(failed).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('logout clears the signals and the stored token', () => {
    const service = create();
    service.login({ email: ADA.email, password: 'x' }).subscribe();
    http.expectOne('/api/auth/login').flush(RESPONSE);

    service.logout();

    expect(service.token()).toBeNull();
    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  describe('auto-login (restore)', () => {
    it('restores the user from /me with the stored token', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-jwt');
      const service = create();

      const done = service.restore();
      const req = http.expectOne('/api/auth/me');
      expect(req.request.headers.get('Authorization')).toBe('Bearer stored-jwt');
      req.flush(ADA);
      await done;

      expect(service.user()).toEqual(ADA);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('clears the session when /me answers 401', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'dead-jwt');
      const service = create();

      const done = service.restore();
      http
        .expectOne('/api/auth/me')
        .flush(
          { statusCode: 401, message: 'Unauthorized' },
          { status: 401, statusText: 'Unauthorized' },
        );
      await done;

      expect(service.isAuthenticated()).toBe(false);
      expect(service.token()).toBeNull();
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });

    it('keeps the stored token when the API is merely unreachable', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'good-jwt');
      const service = create();

      const done = service.restore();
      http
        .expectOne('/api/auth/me')
        .flush('bad gateway', { status: 502, statusText: 'Bad Gateway' });
      await done;

      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('good-jwt');
    });

    it('is idempotent: concurrent callers share one request', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-jwt');
      const service = create();

      const first = service.restore();
      const second = service.restore();
      http.expectOne('/api/auth/me').flush(ADA);
      await Promise.all([first, second]);

      expect(service.user()).toEqual(ADA);
    });
  });
});
