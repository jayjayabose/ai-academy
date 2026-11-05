import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { AuthSession } from './core/auth/auth-session';
import { StubAuthSession } from './core/auth/stub-auth-session';

export const appConfig: ApplicationConfig = {
  providers: [
    // Phase 0: stub session. The auth agent swaps this for the real AuthService
    // (and adds the bearer interceptor); nobody else edits this file.
    { provide: AuthSession, useClass: StubAuthSession },
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    // No interceptors. Until apps/api existed, a fixtureInterceptor answered
    // /api/** in-process; every request now goes over the wire through
    // proxy.conf.js to the API (PORT in .env.local). LeadService did not change — it was
    // always the real client.
    provideHttpClient(withFetch()),
  ],
};
