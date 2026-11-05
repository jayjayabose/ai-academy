import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService, TOKEN_STORAGE_KEY } from '../../core/auth/auth.service';
import { AuthMenu } from './auth-menu';

describe('AuthMenu', () => {
  let fixture: ComponentFixture<AuthMenu>;
  let auth: AuthService;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(AuthMenu);
    fixture.detectChanges();
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('shows a Log in link when signed out', () => {
    expect(text()).toContain('Log in');
    expect(text()).not.toContain('Logout');
    expect(fixture.nativeElement.querySelector('a')?.getAttribute('href')).toBe('/login');
  });

  it('shows the full name and Logout when signed in', () => {
    auth.token.set('jwt');
    auth.user.set({ id: 'u1', email: 'a@b.co', firstName: 'Ada', lastName: 'Lovelace' });
    fixture.detectChanges();

    expect(text()).toContain('Ada Lovelace');
    expect(text()).toContain('Logout');
    expect(text()).not.toContain('Log in');
  });

  it('Logout clears the token and state and goes to /login', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt');
    auth.token.set('jwt');
    auth.user.set({ id: 'u1', email: 'a@b.co', firstName: 'Ada', lastName: 'Lovelace' });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
