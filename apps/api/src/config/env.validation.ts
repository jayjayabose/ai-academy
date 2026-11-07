import * as Joi from 'joi';

/**
 * Decision 5: fail loudly at boot on missing configuration. A missing env var
 * that surfaces as a Sequelize connection timeout three minutes later is the
 * most common way a fresh clone wastes someone's morning.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(4000),

  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_TEST_NAME: Joi.string().required(),

  // Optional at boot so a fresh clone without a key still runs the CRM.
  // The summarize path fails loudly and specifically when it is missing.
  // Auth. No default for the secret: a missing or short one must stop the boot,
  // not silently sign tokens with a guessable key.
  JWT_SECRET: Joi.string().min(32).required().messages({
    'any.required':
      'JWT_SECRET is required (min 32 characters). Set it in .env.local.',
    'string.empty':
      'JWT_SECRET is required (min 32 characters). Set it in .env.local.',
    'string.min': 'JWT_SECRET must be at least 32 characters long.',
  }),
  JWT_EXPIRES_IN: Joi.string().default('24h'),

  ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
});
