import * as Joi from 'joi';

/**
 * Decision 5: fail loudly at boot on missing configuration. A missing env var
 * that surfaces as a Sequelize connection timeout three minutes later is the
 * most common way a fresh clone wastes someone's morning.
 */
export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: Joi.number().port().default(3000),

    DB_HOST: Joi.string().hostname().required(),
    DB_PORT: Joi.number().port().required(),
    DB_USER: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_NAME: Joi.string().required(),
    DB_TEST_NAME: Joi.string().required(),

    // Optional until Day 2 introduces the AI features.
    OPENROUTER_API_KEY: Joi.string().allow('').optional(),
});
