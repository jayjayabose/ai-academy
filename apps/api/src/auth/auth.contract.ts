import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

/**
 * THE SEAM between the auth feature and everything that needs to know who is calling.
 *
 * Phase 0 contract, owned by the orchestrator. Neither parallel agent edits this file.
 *   - The auth agent implements `TokenVerifier` (JWT) and binds it to TOKEN_VERIFIER.
 *   - The notifications agent depends only on what is exported here: the guard, the
 *     decorators, and the verifier interface for the WebSocket handshake.
 *
 * Until the branches merge, AuthModule binds TOKEN_VERIFIER to a stub (see
 * stub-token-verifier.ts). The auth agent replaces that binding and deletes the stub.
 */

/** What every authenticated request and socket knows about its caller. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface TokenVerifier {
  /** Resolves the caller, or REJECTS for any invalid, expired or unknown token. */
  verify(token: string): Promise<AuthenticatedUser>;
}

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

export const IS_PUBLIC_KEY = 'isPublic';

/** Opts a route out of the global guard (register, login, health). */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

/** Returns the token from `Authorization: Bearer <token>`, or null if absent/malformed. */
export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
    return null;
  }
  return token;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException('Unauthorized');

    try {
      request.user = await this.verifier.verify(token);
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
    return true;
  }
}

/** The authenticated caller. Only valid on routes the guard has run for. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) throw new UnauthorizedException('Unauthorized');
    return user;
  },
);
