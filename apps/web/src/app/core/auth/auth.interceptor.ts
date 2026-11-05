import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

const API_PREFIX = '/api/';
const AUTH_PREFIX = '/api/auth/';

/**
 * Adds the bearer token to every `/api/**` request, and ends the session on a 401.
 *
 * `/api/auth/**` is exempt from the 401 handling: a wrong password is a 401 that
 * the login form must show, and a dead token during startup restore is handled
 * by AuthService itself. Redirecting from here for either would be wrong.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_PREFIX)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();

  const outgoing = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.startsWith(AUTH_PREFIX)
      ) {
        auth.clearSession();
        const returnUrl = router.url;
        void router.navigate(
          ['/login'],
          returnUrl.startsWith('/login') ? {} : { queryParams: { returnUrl } },
        );
      }
      return throwError(() => error);
    }),
  );
};
