const successResponse = (res, {
  statusCode = 200,
  message = 'Success',
  data = null,
  meta = null
} = {}) => {
  const body = {
    success: true,
    message,
    data
  };

  if (meta) {
    body.meta = meta;
  }

  return res.status(statusCode).json(body);
};

const errorResponse = (res, {
  statusCode = 500,
  message = 'Internal server error',
  errors = null,
  stack = null
} = {}) => {
  const body = {
    success: false,
    message
  };

  if (errors) {
    body.errors = errors;
  }

  if (stack) {
    body.stack = stack;
  }

  return res.status(statusCode).json(body);
};

module.exports = {
  successResponse,
  errorResponse
};
