const Joi = require('joi');
const { ApiError } = require('./error');

/**
 * Middleware factory for Joi request validation
 * @param {object} schema Joi schema containing body, query, and/or params
 */
const validate = (schema) => (req, res, next) => {
  const validSchema = {};
  ['params', 'query', 'body'].forEach((key) => {
    if (schema[key]) {
      validSchema[key] = schema[key];
    }
  });

  const object = {};
  Object.keys(validSchema).forEach((key) => {
    object[key] = req[key];
  });

  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new ApiError(400, errorMessage));
  }

  Object.assign(req, value);
  return next();
};

module.exports = validate;
