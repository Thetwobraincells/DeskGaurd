const dotenv = require('dotenv');
const Joi = require('joi');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').default('development'),
    PORT: Joi.number().default(3001),
    DATABASE_URL: Joi.string().required().description('PostgreSQL Database URL connection string'),
    REDIS_URL: Joi.string().required().description('Redis URL connection string'),
    FRONTEND_URL: Joi.string().default('http://localhost:3000').description('CORS allowed origin URL'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  databaseUrl: envVars.DATABASE_URL,
  redisUrl: envVars.REDIS_URL,
  frontendUrl: envVars.FRONTEND_URL,
};
