import { Injectable, computed, signal } from '@angular/core';
import type { User } from '@ai-academy/shared';
import { AuthSession } from './auth-session';

/**
 * PLACEHOLDER until the auth branch merges. Reads a fake session from localStorage so
 * the notifications UI can be driven in a real browser before login exists:
 *
 *   localStorage.setItem('dev-token', 'dev-token-<user-uuid>');
 *   localStorage.setItem('dev-user', JSON.stringify({ id, email, firstName, lastName }));
 *   location.reload();
 *
 * The token format matches the API's StubTokenVerifier. The auth agent replaces the
 * provider in app.config.ts with the real AuthService and deletes this file.
 */
@Injectable()
export class StubAuthSession extends AuthSession {
  readonly token = signal<string | null>(localStorage.getItem('dev-token'));
  readonly user = signal<User | null>(readUser());
  readonly isAuthenticated = computed(() => this.token() !== null);
}

function readUser(): User | null {
  const raw = localStorage.getItem('dev-user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
