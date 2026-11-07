import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import type { AuthResponse } from '@ai-academy/shared';

import { AuthService } from '../../core/auth/auth.service';
import { Register } from './register';

const RESPONSE: AuthResponse = {
  token: 'jwt',
  user: { id: 'u1', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
};

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let http: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;

  function type(selector: string, value: string): void {
    const field = el(selector) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
  }

  function fillValid(): void {
    type('#firstName', 'Ada');
    type('#lastName', 'Lovelace');
    type('#email', 'ada@example.com');
    type('#password', 'correct-horse');
  }

  function submit(): void {
    (el('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('shows a message under each invalid field and sends nothing', () => {
    type('#email', 'nope');
    type('#password', 'short');

    submit();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('First name is required.');
    expect(text).toContain('Last name is required.');
    expect(text).toContain('Enter a valid email address.');
    expect(text).toContain('Password must be at least 8 characters.');
    http.expectNone('/api/auth/register');
  });

  it('registers, signs in and goes to /leads', () => {
    fillValid();

    submit();
    const req = http.expectOne('/api/auth/register');
    expect(req.request.body).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'correct-horse',
    });
    req.flush(RESPONSE);

    expect(TestBed.inject(AuthService).user()?.firstName).toBe('Ada');
    expect(navigateByUrl).toHaveBeenCalledWith('/leads');
  });

  it('shows "Email already in use" on a 409', () => {
    fillValid();

    submit();
    http
      .expectOne('/api/auth/register')
      .flush(
        { statusCode: 409, message: 'Email already in use' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(el('.errors').textContent).toContain('Email already in use');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('disables submit while pending', () => {
    fillValid();

    submit();

    expect((el('button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
    http.expectOne('/api/auth/register');
  });
});
