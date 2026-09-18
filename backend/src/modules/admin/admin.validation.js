const { body } = require('express-validator');

const adminLoginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid admin email is required')
    .normalizeEmail(),
  body('password')
    .isString()
    .notEmpty()
    .withMessage('Admin password is required'),
  body('totpCode')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('A valid 6-digit admin authenticator code is required')
];

module.exports = {
  adminLoginValidation
};
