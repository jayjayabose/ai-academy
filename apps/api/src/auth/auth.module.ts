import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import {
  JwtModule,
  type JwtModuleOptions,
  type JwtSignOptions,
} from '@nestjs/jwt';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthController } from './auth.controller';
import { JwtAuthGuard, TOKEN_VERIFIER } from './auth.contract';
import { AuthService } from './auth.service';
import { JwtTokenVerifier } from './jwt-token-verifier';
import { User } from './user.model';

/**
 * Global so any module can inject TOKEN_VERIFIER or use JwtAuthGuard without
 * importing AuthModule.
 *
 * JwtAuthGuard is registered as APP_GUARD: every route is protected unless it
 * carries @Public(), which is how /api/leads and /api/interactions became
 * authenticated without their controllers changing.
 */
@Global()
@Module({
  imports: [
    SequelizeModule.forFeature([User]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        // getOrThrow: env.validation already fails the boot, this is the second net.
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          // Joi has already defaulted and validated it; jsonwebtoken parses "24h" / "3600s".
          expiresIn: config.getOrThrow<string>(
            'JWT_EXPIRES_IN',
          ) as JwtSignOptions['expiresIn'],
        },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtTokenVerifier,
    { provide: TOKEN_VERIFIER, useExisting: JwtTokenVerifier },
    JwtAuthGuard,
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
  ],
  exports: [TOKEN_VERIFIER, JwtAuthGuard],
})
export class AuthModule {}
