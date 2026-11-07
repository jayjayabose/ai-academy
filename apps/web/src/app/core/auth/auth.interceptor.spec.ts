import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import type { User } from '@ai-academy/shared';

import { authInterceptor } from './auth.interceptor';
import { AuthService, TOKEN_STORAGE_KEY } from './auth.service';

const ADA: User = { id: 'u1', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' };
const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  function signIn(): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt');
    auth.token.set('jwt');
    auth.user.set(ADA);
  }

  it('adds the bearer header to /api requests when signed in', () => {
    signIn();

    client.get('/api/leads').subscribe();

    expect(http.expectOne('/api/leads').request.headers.get('Authorization')).toBe('Bearer jwt');
  });

  it('adds no header when signed out', () => {
    client.get('/api/leads').subscribe();

    expect(http.expectOne('/api/leads').request.headers.has('Authorization')).toBe(false);
  });

  it('never sends the token to a non-/api URL', () => {
    signIn();

    client.get('https://elsewhere.example/data').subscribe();

    expect(
      http.expectOne('https://elsewhere.example/data').request.headers.has('Authorization'),
    ).toBe(false);
  });

  it('on a 401 from a protected route: clears the session and goes to /login', () => {
    signIn();
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue('/leads/42');
    let failed = false;

    client.get('/api/leads').subscribe({ error: () => (failed = true) });
    http.expectOne('/api/leads').flush({ statusCode: 401, message: 'Unauthorized' }, UNAUTHORIZED);

    expect(failed).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/leads/42' } });
  });

  it('a 401 from /api/auth/login (wrong password) neither redirects nor clears anything', () => {
    signIn();
    let status = 0;

    client
      .post('/api/auth/login', {})
      .subscribe({ error: (e: { status: number }) => (status = e.status) });
    http
      .expectOne('/api/auth/login')
      .flush({ statusCode: 401, message: 'Invalid credentials' }, UNAUTHORIZED);

    expect(status).toBe(401);
    expect(navigate).not.toHaveBeenCalled();
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('does not react to non-401 errors', () => {
    signIn();

    client.get('/api/leads').subscribe({ error: () => undefined });
    http.expectOne('/api/leads').flush('boom', { status: 500, statusText: 'Server Error' });

    expect(navigate).not.toHaveBeenCalled();
    expect(auth.isAuthenticated()).toBe(true);
  });
});
