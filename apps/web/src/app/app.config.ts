import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    // No interceptors. Until apps/api existed, a fixtureInterceptor answered
    // /api/** in-process; every request now goes over the wire through
    // proxy.conf.json to localhost:3000. LeadService did not change — it was
    // always the real client.
    provideHttpClient(withFetch()),
  ],
};
