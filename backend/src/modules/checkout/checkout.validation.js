const { body } = require('express-validator');

const shippingInfoValidation = [
  body().custom((value) => {
    if (value.deliveryAddressId || value.shippingInfo) return true;
    throw new Error('Please add a delivery address before checkout.');
  }),
  body('deliveryAddressId').optional({ checkFalsy: true }).isMongoId().withMessage('A valid delivery address id is required'),
  body('shippingInfo.name').if(body('shippingInfo').exists()).trim().notEmpty().withMessage('Shipping name is required'),
  body('shippingInfo.email').if(body('shippingInfo').exists()).trim().isEmail().withMessage('A valid shipping email is required').normalizeEmail(),
  body('shippingInfo.phone').if(body('shippingInfo').exists()).trim().notEmpty().withMessage('Shipping phone is required'),
  body('shippingInfo.address').if(body('shippingInfo').exists()).trim().notEmpty().withMessage('Shipping address is required'),
  body('shippingInfo.city').if(body('shippingInfo').exists()).trim().notEmpty().withMessage('Shipping city is required'),
  body('shippingInfo.state').if(body('shippingInfo').exists()).trim().notEmpty().withMessage('Shipping state is required'),
  body('shippingInfo.postalCode').if(body('shippingInfo').exists()).trim().notEmpty().withMessage('Shipping postal code is required')
];

const placeOrderValidation = [
  ...shippingInfoValidation,
  body('paymentMethod')
    .isIn(['UPI', 'card', 'netbanking', 'wallet'])
    .withMessage('Payment method must be UPI, card, netbanking, or wallet')
];

const verifyCheckoutValidation = [
  body('razorpayOrderId').trim().notEmpty().withMessage('razorpayOrderId is required'),
  body('razorpayPaymentId').trim().notEmpty().withMessage('razorpayPaymentId is required'),
  body('razorpaySignature').trim().notEmpty().withMessage('razorpaySignature is required'),
  ...placeOrderValidation
];

module.exports = {
  placeOrderValidation,
  verifyCheckoutValidation
};
