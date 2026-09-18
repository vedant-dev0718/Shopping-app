const { errorResponse } = require('../utils/apiResponse');

const errorMiddleware = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || null;

  if (statusCode >= 400) {
    console.error(`\n🔴 ERROR [${statusCode}] ${req.method} ${req.originalUrl}`);
    console.error('  Message:', message);
    if (errors) console.error('  Errors :', JSON.stringify(errors).substring(0, 600));
    if (statusCode === 500) console.error('  Stack  :', err.stack?.split('\n').slice(0, 4).join('\n'));
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((error) => error.message);
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier';
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value';
    errors = Object.keys(err.keyValue || {});
  }

  return errorResponse(res, {
    statusCode,
    message,
    errors,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorMiddleware;
