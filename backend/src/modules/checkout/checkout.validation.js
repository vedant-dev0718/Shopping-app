const { body } = require('express-validator');

const shippingInfoValidation = [
  body().custom((value) => {
    if (value.deliveryAddressId || value.addressId || value.shippingInfo) return true;
    throw new Error('Please add a delivery address before checkout.');
  }),
  body('deliveryAddressId').optional({ checkFalsy: true }).isMongoId().withMessage('A valid delivery address id is required'),
  body('addressId').optional({ checkFalsy: true }).isMongoId().withMessage('A valid delivery address id is required'),
  body('shippingInfo.name').if(body('shippingInfo').exists()).trim().notEmpty().withMessage('Shipping name is required'),
  body('shippingInfo.email').if(body('shippingInfo').exists()).trim().isEmail().withMessage('A valid shipping email is required').normalizeEmail(),
  body('shippingInfo.phone').if(body('shippingInfo').exists()).trim().notEmpty().withMessage('Shipping phone is required'),
  body('shippingInfo.address').if(body('shippingInfo').exists()).trim().notEmpty().withMessage('Shipping address is required'),
  body('shippingInfo.city').if(body('shippingInfo').exists()).trim().notEmpty().withMessage('Shipping city is required'),
  body('shippingInfo.state').if(body('shippingInfo').exists()).trim().notEmpty().withMessage('Shipping state is required'),
  body('shippingInfo.postalCode').if(body('shippingInfo').exists()).trim().notEmpty().withMessage('Shipping postal code is required')
];

const placeCodValidation = [
  ...shippingInfoValidation,
  body('paymentMethod')
    .equals('COD')
    .withMessage('paymentMethod must be COD for this endpoint')
];

const placeQrPaymentValidation = [
  ...shippingInfoValidation,
  body('paymentMethod')
    .equals('UPI_QR')
    .withMessage('paymentMethod must be UPI_QR for this endpoint')
];

module.exports = {
  placeCodValidation,
  placeQrPaymentValidation
};
