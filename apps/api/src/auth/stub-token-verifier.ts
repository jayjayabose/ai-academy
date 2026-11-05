import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser, TokenVerifier } from './auth.contract';

const STUB_TOKEN = /^dev-token-([0-9a-f-]{36})$/i;

/**
 * PLACEHOLDER until the auth branch merges. Accepts `dev-token-<user-uuid>` and
 * resolves it to that user, so the notifications agent can authenticate HTTP and
 * WebSocket callers without a real JWT.
 *
 * The auth agent deletes this file and binds TOKEN_VERIFIER to the real JWT verifier
 * in auth.module.ts. If this file still exists after integration, something was missed.
 */
@Injectable()
export class StubTokenVerifier implements TokenVerifier {
  verify(token: string): Promise<AuthenticatedUser> {
    const match = STUB_TOKEN.exec(token);
    if (!match) return Promise.reject(new Error('invalid stub token'));
    const id = match[1].toLowerCase();
    return Promise.resolve({ id, email: `${id}@dev.local` });
  }
}
