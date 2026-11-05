import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard, TOKEN_VERIFIER } from './auth.contract';
import { StubTokenVerifier } from './stub-token-verifier';

/**
 * SKELETON (Phase 0). Owned by the auth agent from here on.
 *
 * Global so any module can inject TOKEN_VERIFIER or use JwtAuthGuard without
 * importing AuthModule. The auth agent:
 *   1. replaces the StubTokenVerifier binding with the real JWT verifier,
 *   2. deletes stub-token-verifier.ts,
 *   3. adds the controller/service/model, and registers JwtAuthGuard as APP_GUARD
 *      (routes opt out with @Public()), so existing lead endpoints are protected
 *      without editing their controllers.
 */
@Global()
@Module({
  providers: [
    { provide: TOKEN_VERIFIER, useClass: StubTokenVerifier },
    JwtAuthGuard,
  ],
  exports: [TOKEN_VERIFIER, JwtAuthGuard],
})
export class AuthModule {}
