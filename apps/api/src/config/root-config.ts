import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';
import { envFilePath } from './workspace-env';

/**
 * The single definition of how configuration is loaded and validated.
 *
 * AppModule and SeedModule both import this rather than each calling
 * ConfigModule.forRoot(). Two copies would drift, and the direction they drift
 * in is the dangerous one: a seeder that boots with weaker validation than the
 * server writes 100 rows somewhere unintended before anyone notices. Decision 5
 * calls for one source of truth; this is it.
 */
export const RootConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  // Trap #4: resolved from the workspace root, not relative to cwd.
  envFilePath: envFilePath(),
  validationSchema: envValidationSchema,
  validationOptions: { abortEarly: false },
});
