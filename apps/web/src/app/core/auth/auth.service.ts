import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, tap } from 'rxjs';

import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@ai-academy/shared';

import { AuthSession } from './auth-session';

/** localStorage key. Deliberately not `dev-token`, which the Phase 0 stub used. */
export const TOKEN_STORAGE_KEY = 'auth-token';

/**
 * The real session. Implements the frozen {@link AuthSession} seam; everything
 * else (login, register, logout, restore) is this feature's own surface.
 *
 * Only the token is persisted. The user is never trusted from storage: on start
 * {@link restore} asks `GET /api/auth/me`, so a deleted account or an expired
 * token cannot present as signed in.
 */
@Injectable({ providedIn: 'root' })
export class AuthService extends AuthSession {
  private readonly http = inject(HttpClient);

  readonly token = signal<string | null>(readStoredToken());
  readonly user = signal<User | null>(null);
  /** Signed in means the server has confirmed the user, not merely that a token exists. */
  readonly isAuthenticated = computed(() => this.token() !== null && this.user() !== null);

  private restoring: Promise<void> | null = null;

  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', body).pipe(tap((r) => this.begin(r)));
  }

  register(body: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', body).pipe(tap((r) => this.begin(r)));
  }

  /** Clears the token and the user. Navigation is the caller's job. */
  logout(): void {
    this.clearSession();
  }

  clearSession(): void {
    this.token.set(null);
    this.user.set(null);
    removeStoredToken();
  }

  /**
   * Auto-login. Resolves once the stored token (if any) has been checked, and
   * never rejects. Idempotent: every caller gets the same promise, so the
   * app initializer and the route guards can all await it.
   *
   * 401 means the token is dead, so it is removed. Any other failure (API down,
   * 502) leaves the stored token alone — an outage should not log everyone out —
   * but the session is signed-out in memory until the next load.
   */
  restore(): Promise<void> {
    this.restoring ??= this.runRestore();
    return this.restoring;
  }

  private async runRestore(): Promise<void> {
    const token = this.token();
    if (token === null || this.user() !== null) return;

    try {
      // The interceptor attaches the header from token(); /api/auth/ is exempt
      // from its 401 handling, so a dead token lands here and not in a redirect.
      this.user.set(await firstValueFrom(this.http.get<User>('/api/auth/me')));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.clearSession();
      } else {
        this.token.set(null);
      }
    }
  }

  private begin(response: AuthResponse): void {
    writeStoredToken(response.token);
    this.token.set(response.token);
    this.user.set(response.user);
    // A session that was just established needs no restore.
    this.restoring = Promise.resolve();
  }
}

// localStorage can throw (private mode, disabled storage). A session that lives
// only in memory is better than a login screen that cannot sign anyone in.
function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* in-memory only */
  }
}

function removeStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* nothing to remove */
  }
}
