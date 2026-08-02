const router = require('express').Router();
const { body } = require('express-validator');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const { authenticate } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const authController = require('./auth.controller');
const {
  buyerSignupValidation,
  sellerSignupValidation,
  loginValidation,
  verifySignupEmailValidation,
  resendSignupCodeValidation,
  forgotPasswordValidation,
  verifyResetOtpValidation,
  resetPasswordValidation,
  changePasswordValidation
} = require('./auth.validation');

const updateProfileValidation = [
  body('name').optional({ checkFalsy: true }).trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1–100 characters'),
  body('phone').optional({ checkFalsy: true }).trim().isMobilePhone('any').withMessage('Enter a valid phone number'),
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).withMessage('Address must be 300 characters or fewer')
];

const googleValidation = [
  body('idToken').trim().notEmpty().withMessage('Google idToken is required'),
  body('role').optional({ checkFalsy: true }).trim().isIn(['buyer', 'seller']).withMessage('Role must be buyer or seller')
];

const appleValidation = [
  body('identityToken').trim().notEmpty().withMessage('Apple identityToken is required'),
  body('fullName').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Name must be 100 characters or fewer'),
  body('role').optional({ checkFalsy: true }).trim().isIn(['buyer', 'seller']).withMessage('Role must be buyer or seller')
];

const completeGoogleProfileValidation = [
  body('storeName').trim().notEmpty().withMessage('Store name is required'),
  body('storeCategory').trim().notEmpty().withMessage('Store category is required'),
  body('locality').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Locality must be 120 characters or fewer'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pincode').optional({ checkFalsy: true }).trim().matches(/^\d{6}$/).withMessage('Pincode must be a 6-digit number'),
  body('country').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Country must be 80 characters or fewer'),
  body('specialtyRegion').trim().notEmpty().withMessage('Specialty region is required'),
  body('storeDescription').trim().notEmpty().withMessage('Store description is required'),
  body('phone').optional({ checkFalsy: true }).trim().isMobilePhone('any').withMessage('Enter a valid phone number')
];

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();

    return `${email || 'unknown'}:${ipKeyGenerator(req.ip)}`;
  },
  message: {
    success: false,
    message: 'Too many failed login attempts. Try again after 15 minutes.'
  }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();

    return email || `unknown:${ipKeyGenerator(req.ip)}`;
  },
  message: {
    success: false,
    message: 'Too many password reset codes requested. Try again after 1 hour.'
  }
});

const verifyResetOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();

    return `${email || 'unknown'}:${ipKeyGenerator(req.ip)}`;
  },
  message: {
    success: false,
    message: 'Too many reset code verification attempts. Try again after 15 minutes.'
  }
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: {
    success: false,
    message: 'Too many reset password attempts. Try again after 15 minutes.'
  }
});

router.post('/signup/buyer', buyerSignupValidation, validate, authController.signupBuyer);
router.post('/signup/seller', sellerSignupValidation, validate, authController.signupSeller);
router.post('/signup/buyer/start', buyerSignupValidation, validate, authController.startBuyerSignup);
router.post('/signup/seller/start', sellerSignupValidation, validate, authController.startSellerSignup);
router.post('/signup/resend-code', resendSignupCodeValidation, validate, authController.resendSignupCode);
router.post('/signup/verify-email', verifySignupEmailValidation, validate, authController.verifySignupEmail);
router.post('/google', googleValidation, validate, authController.google);
router.post('/apple', appleValidation, validate, authController.apple);
router.post('/google/complete-profile', authenticate, completeGoogleProfileValidation, validate, authController.completeGoogleProfile);
router.post('/login', loginLimiter, loginValidation, validate, authController.login);
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidation, validate, authController.forgotPassword);
router.post('/verify-reset-otp', verifyResetOtpLimiter, verifyResetOtpValidation, validate, authController.verifyResetOtp);
router.post('/reset-password', resetPasswordLimiter, resetPasswordValidation, validate, authController.resetPassword);
router.post('/change-password', authenticate, changePasswordValidation, validate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, updateProfileValidation, validate, authController.updateProfile);
router.delete('/account', authenticate, authController.deleteAccount);

module.exports = router;
