import { computed, signal } from '@angular/core';
import type { User } from '@ai-academy/shared';

import { AuthSession } from '../core/auth/auth-session';
import type { NotificationSocket } from './notification-socket.service';

/** A session the test can sign in and out of. */
export class FakeAuthSession extends AuthSession {
  readonly token = signal<string | null>(null);
  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.token() !== null);

  signIn(token = 'dev-token-1'): void {
    this.token.set(token);
  }

  signOut(): void {
    this.token.set(null);
  }
}

type Handler = (...args: unknown[]) => void;

/** Just enough of a socket.io client socket: records handlers, and lets a test fire server events. */
export class FakeSocket {
  readonly handlers = new Map<string, Handler>();
  disconnected = false;

  on(event: string, handler: Handler): this {
    this.handlers.set(event, handler);
    return this;
  }

  removeAllListeners(): this {
    this.handlers.clear();
    return this;
  }

  disconnect(): this {
    this.disconnected = true;
    return this;
  }

  /** Server -> client. */
  fire(event: string, payload?: unknown): void {
    this.handlers.get(event)?.(payload);
  }

  asSocket(): NotificationSocket {
    return this as unknown as NotificationSocket;
  }
}
