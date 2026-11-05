import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Both guards wait for the startup restore before deciding. Without the wait, a
 * refresh on /leads would briefly look signed out and bounce to /login.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.restore();
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** For /login and /register: someone already signed in has nothing to do there. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.restore();
  return auth.isAuthenticated() ? router.createUrlTree(['/leads']) : true;
};

/**
 * `returnUrl` comes from the address bar, so it is untrusted. Only same-app
 * absolute paths are followed; `//evil.example` and `https://…` fall back.
 */
export function safeReturnUrl(value: string | null | undefined, fallback = '/leads'): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
