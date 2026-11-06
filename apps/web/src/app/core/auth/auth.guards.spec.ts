import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import type { User } from '@ai-academy/shared';

import { authGuard, guestGuard, safeReturnUrl } from './auth.guards';
import { authInterceptor } from './auth.interceptor';
import { AuthService, TOKEN_STORAGE_KEY } from './auth.service';

const ADA: User = { id: 'u1', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' };
const route = {} as ActivatedRouteSnapshot;
const stateFor = (url: string) => ({ url }) as RouterStateSnapshot;

describe('route guards', () => {
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  const runAuth = (url: string) =>
    TestBed.runInInjectionContext(() => authGuard(route, stateFor(url))) as Promise<
      boolean | UrlTree
    >;
  const runGuest = () =>
    TestBed.runInInjectionContext(() => guestGuard(route, stateFor('/login'))) as Promise<
      boolean | UrlTree
    >;

  describe('authGuard', () => {
    it('redirects a signed-out visitor to /login with the returnUrl', async () => {
      const result = await runAuth('/leads');

      expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fleads');
    });

    it('allows a signed-in user', async () => {
      const auth = TestBed.inject(AuthService);
      auth.token.set('jwt');
      auth.user.set(ADA);

      expect(await runAuth('/leads')).toBe(true);
    });

    it('WAITS for the startup restore before deciding (no flash redirect)', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-jwt');
      let settled = false;

      const decision = runAuth('/leads/7').then((r) => {
        settled = true;
        return r;
      });
      await Promise.resolve();
      expect(settled).toBe(false);

      http.expectOne('/api/auth/me').flush(ADA);

      expect(await decision).toBe(true);
    });

    it('redirects when the stored token turns out to be dead', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'dead-jwt');

      const decision = runAuth('/leads');
      http
        .expectOne('/api/auth/me')
        .flush(
          { statusCode: 401, message: 'Unauthorized' },
          { status: 401, statusText: 'Unauthorized' },
        );

      expect(router.serializeUrl((await decision) as UrlTree)).toBe('/login?returnUrl=%2Fleads');
    });
  });

  describe('guestGuard', () => {
    it('lets a signed-out visitor see /login', async () => {
      expect(await runGuest()).toBe(true);
    });

    it('sends an already signed-in user to /leads', async () => {
      const auth = TestBed.inject(AuthService);
      auth.token.set('jwt');
      auth.user.set(ADA);

      expect(router.serializeUrl((await runGuest()) as UrlTree)).toBe('/leads');
    });
  });
});

describe('safeReturnUrl', () => {
  it.each([
    ['/leads/42', '/leads/42'],
    ['/leads?x=1', '/leads?x=1'],
    [null, '/leads'],
    [undefined, '/leads'],
    ['', '/leads'],
    ['https://evil.example', '/leads'],
    ['//evil.example', '/leads'],
    ['/\\evil.example', '/leads'],
    ['leads', '/leads'],
  ])('%p -> %p', (input, expected) => {
    expect(safeReturnUrl(input)).toBe(expected);
  });
});
