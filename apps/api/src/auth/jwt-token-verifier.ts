import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser, TokenVerifier } from './auth.contract';

/**
 * Verifies signature and expiry (HS256 only) and resolves the caller from the
 * token claims. Rejects on anything invalid; the guard turns that into a 401.
 */
@Injectable()
export class JwtTokenVerifier implements TokenVerifier {
  constructor(private readonly jwt: JwtService) {}

  async verify(token: string): Promise<AuthenticatedUser> {
    const payload = await this.jwt.verifyAsync<{
      sub?: unknown;
      email?: unknown;
    }>(token, { algorithms: ['HS256'] });

    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new Error('Token is missing its sub or email claim');
    }
    return { id: payload.sub, email: payload.email };
  }
}
