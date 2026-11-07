import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import type { AuthResponse } from '@ai-academy/shared';

import { AuthService } from '../../core/auth/auth.service';
import { Login } from './login';

const RESPONSE: AuthResponse = {
  token: 'jwt',
  user: { id: 'u1', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
};

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  function setup(returnUrl: string | null = null): void {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const input = (selector: string) => el(selector) as HTMLInputElement;

  function type(selector: string, value: string): void {
    const field = input(selector);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
  }

  function submit(): void {
    (el('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('shows field-level messages and sends nothing when the form is empty', () => {
    setup();

    submit();

    expect(fixture.nativeElement.textContent).toContain('Email is required.');
    expect(fixture.nativeElement.textContent).toContain('Password is required.');
    http.expectNone('/api/auth/login');
  });

  it('rejects a malformed email client-side', () => {
    setup();
    type('#email', 'not-an-email');
    type('#password', 'whatever');

    submit();

    expect(fixture.nativeElement.textContent).toContain('Enter a valid email address.');
    http.expectNone('/api/auth/login');
  });

  it('signs in and navigates to /leads by default', () => {
    setup();
    type('#email', ' ada@example.com ');
    type('#password', 'correct-horse');

    submit();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ email: 'ada@example.com', password: 'correct-horse' });
    req.flush(RESPONSE);

    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(true);
    expect(navigateByUrl).toHaveBeenCalledWith('/leads');
  });

  it('navigates to the returnUrl after success', () => {
    setup('/leads/42');
    type('#email', 'ada@example.com');
    type('#password', 'correct-horse');

    submit();
    http.expectOne('/api/auth/login').flush(RESPONSE);

    expect(navigateByUrl).toHaveBeenCalledWith('/leads/42');
  });

  it('ignores an off-site returnUrl', () => {
    setup('https://evil.example');
    type('#email', 'ada@example.com');
    type('#password', 'correct-horse');

    submit();
    http.expectOne('/api/auth/login').flush(RESPONSE);

    expect(navigateByUrl).toHaveBeenCalledWith('/leads');
  });

  it('shows the server message on a 401 and re-enables the button', () => {
    setup();
    type('#email', 'ada@example.com');
    type('#password', 'wrong-password');

    submit();
    http
      .expectOne('/api/auth/login')
      .flush(
        { statusCode: 401, message: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' },
      );
    fixture.detectChanges();

    expect(el('.errors').textContent).toContain('Invalid credentials');
    expect((el('button[type=submit]') as HTMLButtonElement).disabled).toBe(false);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('disables the submit button while the request is pending', () => {
    setup();
    type('#email', 'ada@example.com');
    type('#password', 'correct-horse');

    submit();

    expect((el('button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
    http.expectOne('/api/auth/login');
  });
});
