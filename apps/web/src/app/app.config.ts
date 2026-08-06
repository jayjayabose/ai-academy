import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
// TEMPORARY — the entire fixture layer hangs off this one import.
// When apps/api is serving /api/**:
//   1. delete this import,
//   2. delete `withInterceptors([fixtureInterceptor])` from provideHttpClient below,
//   3. delete src/app/fixtures/.
// Nothing else changes: LeadService is the real client and the components never
// knew the difference.
import { fixtureInterceptor } from './fixtures/fixture.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([fixtureInterceptor])),
  ],
};
