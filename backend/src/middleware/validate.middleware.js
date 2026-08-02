const { validationResult } = require('express-validator');

const AppError = require('../utils/AppError');

const validate = (req, _res, next) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    return next(new AppError('Validation failed', 400, result.array()));
  }

  return next();
};

module.exports = validate;
