import { type INestApplication, ValidationPipe } from '@nestjs/common';

/** Decision 7: one global prefix, so the Angular dev proxy is a single `/api` -> localhost:3000 rule. */
export const API_PREFIX = 'api';

/**
 * Everything about the HTTP surface that is not a module. main.ts calls it, and
 * so does every controller test.
 *
 * Sharing it is the point. A test that built its own ValidationPipe could pass
 * while main.ts shipped a different configuration — and the settings here are
 * exactly the ones whose absence is invisible until a client hits them:
 * `forbidNonWhitelisted` turns a stray property into a 400 rather than silently
 * dropping it, and `whitelist` is what stops an unvalidated field reaching the
 * database at all.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix(API_PREFIX);

  // Decision 11. `forbidNonWhitelisted` is the reason the Angular client builds
  // PATCH payloads field by field from UpdateLeadRequest instead of spreading a
  // fetched entity — a spread carries id/createdAt/updatedAt and earns a 400
  // "property id should not exist" (Trap #9).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Left off deliberately. Implicit conversion would turn `budget: "abc"`
      // into NaN and `bedrooms: "3"` into 3, so a client sending strings for
      // numbers would sometimes pass and sometimes fail on the same field. The
      // DTOs say number; the wire contract says number.
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  return app;
}
