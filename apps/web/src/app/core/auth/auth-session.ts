import type { Signal } from '@angular/core';
import type { User } from '@ai-academy/shared';

/**
 * THE SEAM between the auth feature and anything that needs to know who is signed in.
 *
 * Phase 0 contract, owned by the orchestrator; neither parallel agent edits this file.
 * An abstract class rather than an interface so it doubles as the DI token:
 * `inject(AuthSession)`.
 *   - The auth agent's `AuthService` implements it and is provided in app.config.ts.
 *   - The notifications agent reads `token()` to open the socket and reacts to
 *     `isAuthenticated()` to connect/disconnect. It must not import AuthService.
 */
export abstract class AuthSession {
  /** The JWT, or null when signed out. */
  abstract readonly token: Signal<string | null>;
  abstract readonly user: Signal<User | null>;
  abstract readonly isAuthenticated: Signal<boolean>;
}
