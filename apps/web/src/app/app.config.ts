import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { AuthSession } from './core/auth/auth-session';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // Everything that reads the seam (notifications, header) gets the real session.
    { provide: AuthSession, useExisting: AuthService },
    // Auto-login: check the stored token before the first route resolves. restore()
    // never rejects, so a dead API cannot stop the app from starting.
    provideAppInitializer(() => inject(AuthService).restore()),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    // Every request goes over the wire through proxy.conf.js to the API (PORT in
    // .env.local). The interceptor adds the bearer token and handles 401s.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
  ],
};
