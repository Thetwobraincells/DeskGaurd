const { env } = require('../config/env');

/**
 * Custom operational API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Express error converter/handler
 */
function errorHandler(err, req, res, next) {
  let { statusCode = 500, message } = err;
  
  if (env === 'production' && !err.isOperational) {
    statusCode = 500;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(env === 'development' && { stack: err.stack }),
  };

  if (env === 'development') {
    console.error(err);
  }

  res.status(statusCode).send(response);
}

module.exports = {
  ApiError,
  errorHandler,
};
