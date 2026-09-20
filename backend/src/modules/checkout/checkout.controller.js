const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const checkoutService = require('./checkout.service');

const startCheckout = asyncHandler(async (req, res) => {
  const checkout = await checkoutService.startCheckout(req.user.id);
  return successResponse(res, {
    message: 'Checkout started successfully',
    data: checkout
  });
});

const placeOrder = (method, message) => asyncHandler(async (req, res) => {
  const confirmation = await method(
    req.user.id,
    {
      deliveryAddressId: req.body.deliveryAddressId || req.body.addressId || null,
      shippingInfo: req.body.shippingInfo
    },
    req.body.paymentMethod
  );
  return successResponse(res, { statusCode: 201, message, data: confirmation });
});

module.exports = {
  startCheckout,
  placeCodOrder: placeOrder(checkoutService.placeCodOrder, 'COD order placed successfully'),
  placeQrPaymentOrder: placeOrder(
    checkoutService.placeQrPaymentOrder,
    'UPI payment submitted and awaiting seller confirmation'
  )
};
