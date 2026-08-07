const { validationResult } = require('express-validator');

const AppError = require('../utils/AppError');

const validate = (req, _res, next) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const errors = result.array();
    console.error('\n❌ VALIDATION FAILED');
    console.error('  Route  :', req.method, req.originalUrl);
    console.error('  Body   :', JSON.stringify(req.body, null, 2).substring(0, 500));
    console.error('  Errors :');
    errors.forEach(e => console.error(`    [${e.type}] field="${e.path}" value=${JSON.stringify(e.value)} → ${e.msg}`));
    return next(new AppError('Validation failed', 400, errors));
  }

  return next();
};

module.exports = validate;
