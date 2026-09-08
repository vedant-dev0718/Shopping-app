const { body } = require('express-validator');

const createPasswordValidation = (field = 'password') => body(field)
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/[A-Z]/)
  .withMessage('Password must include an uppercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must include a number')
  .matches(/[^A-Za-z0-9]/)
  .withMessage('Password must include a special character');

const buyerSignupValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  createPasswordValidation(),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('address').trim().notEmpty().withMessage('Address is required')
];

const sellerSignupValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  createPasswordValidation(),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('storeName').trim().notEmpty().withMessage('Store name is required'),
  body('storeCategory').trim().notEmpty().withMessage('Store category is required'),
  body('locality').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Locality must be 120 characters or fewer'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pincode').optional({ checkFalsy: true }).trim().matches(/^\d{6}$/).withMessage('Pincode must be a 6-digit number'),
  body('country').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Country must be 80 characters or fewer'),
  body('specialtyRegion').trim().notEmpty().withMessage('Specialty region is required'),
  body('storeDescription').trim().notEmpty().withMessage('Store description is required'),
  body('gstin').optional({ checkFalsy: true }).trim(),
  body('gstNumber').optional({ checkFalsy: true }).trim(),
  body('upiId').optional({ checkFalsy: true }).trim(),
  body('profileImageUrl').optional({ checkFalsy: true }).trim()
];

const loginValidation = [
  body('identifier').optional({ checkFalsy: true }).trim(),
  body('email').optional({ checkFalsy: true }).trim(),
  body('phone').optional({ checkFalsy: true }).trim(),
  body().custom((value) => {
    const rawIdentifier = (value.identifier || value.email || value.phone || '').trim();
    if (!rawIdentifier) {
      throw new Error('Email or mobile number is required');
    }
    return true;
  }),
  body('password').isString().withMessage('Password must be a string').notEmpty().withMessage('Password is required')
];

const verifySignupEmailValidation = [
  body('verificationId').isMongoId().withMessage('A valid verification id is required'),
  body('otp')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Verification code must be 6 digits')
];

const resendSignupCodeValidation = [
  body('verificationId').isMongoId().withMessage('A valid verification id is required')
];

const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail()
];

const verifyResetOtpValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('otp')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Reset code must be 6 digits')
];

const resetPasswordValidation = [
  body('resetToken').trim().notEmpty().withMessage('Reset token is required'),
  createPasswordValidation('newPassword')
];

const changePasswordValidation = [
  body('currentPassword')
    .isString()
    .withMessage('Current password must be a string')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must include an uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must include a lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must include a number')
];

module.exports = {
  buyerSignupValidation,
  sellerSignupValidation,
  loginValidation,
  verifySignupEmailValidation,
  resendSignupCodeValidation,
  forgotPasswordValidation,
  verifyResetOtpValidation,
  resetPasswordValidation,
  changePasswordValidation
};
