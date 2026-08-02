const { body, param } = require('express-validator');

const env = require('../../config/env');

const productIdValidation = [
  param('productId').isMongoId().withMessage('A valid product id is required')
];

const scheduleValidation = [
  param('productId').isMongoId().withMessage('A valid product id is required'),
  body('startDate').isISO8601().withMessage('A valid startDate is required').toDate(),
  body('endDate').isISO8601().withMessage('A valid endDate is required').toDate(),
  body('reservePrice').optional().isFloat({ min: 0 }).withMessage('reservePrice must be zero or greater').toFloat()
];

const createBidOrderValidation = [
  param('productId').isMongoId().withMessage('A valid product id is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Bid amount must be greater than 0').toFloat()
];

const placeBidValidation = [
  param('productId').isMongoId().withMessage('A valid product id is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Bid amount must be greater than 0').toFloat(),
  body('shippingInfo').isObject().withMessage('Shipping info is required'),
  body('shippingInfo.name').trim().notEmpty().withMessage('Shipping name is required'),
  body('shippingInfo.email').trim().isEmail().withMessage('A valid shipping email is required').normalizeEmail(),
  body('shippingInfo.phone').trim().notEmpty().withMessage('Shipping phone is required'),
  body('shippingInfo.address').trim().notEmpty().withMessage('Shipping address is required'),
  body('shippingInfo.city').trim().notEmpty().withMessage('Shipping city is required'),
  body('shippingInfo.state').trim().notEmpty().withMessage('Shipping state is required'),
  body('shippingInfo.postalCode').trim().notEmpty().withMessage('Shipping postal code is required'),
  body('razorpayPaymentId')
    .if(() => env.nodeEnv === 'production')
    .trim()
    .notEmpty()
    .withMessage('razorpayPaymentId is required')
];

const bidIdValidation = [
  param('bidId').isMongoId().withMessage('A valid bid id is required')
];

module.exports = {
  productIdValidation,
  bidIdValidation,
  scheduleValidation,
  createBidOrderValidation,
  placeBidValidation
};
