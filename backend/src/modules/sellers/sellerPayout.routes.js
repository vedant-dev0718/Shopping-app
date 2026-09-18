const router = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const { requireSeller } = require('../../middleware/role.middleware');
const asyncHandler = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/apiResponse');
const sellerPayoutService = require('./sellerPayout.service');
const SellerProfile = require('./sellerProfile.model');

router.use(authenticate, requireSeller);

router.post('/me/razorpay/onboard', asyncHandler(async (req, res) => {
  const result = await sellerPayoutService.onboardSellerToRazorpay(req.user.id);

  return successResponse(res, {
    statusCode: 201,
    message: 'Seller Razorpay onboarding started successfully',
    data: result
  });
}));

router.get('/me/razorpay/status', asyncHandler(async (req, res) => {
  const profile = await SellerProfile.findOne({ userId: req.user.id })
    .select('razorpayLinkedAccountId razorpayLinkedAccountStatus')
    .lean();

  return successResponse(res, {
    message: 'Seller Razorpay onboarding status fetched successfully',
    data: {
      linkedAccountId: profile ? profile.razorpayLinkedAccountId : '',
      status: profile ? profile.razorpayLinkedAccountStatus : 'not_created'
    }
  });
}));

router.get('/me/earnings', asyncHandler(async (req, res) => {
  const earnings = await sellerPayoutService.getSellerEarnings(req.user.id);

  return successResponse(res, {
    message: 'Seller earnings fetched successfully',
    data: earnings
  });
}));

router.get('/me/transfers', asyncHandler(async (req, res) => {
  const transfers = await sellerPayoutService.getSellerTransfers(req.user.id);

  return successResponse(res, {
    message: 'Seller transfers fetched successfully',
    data: transfers
  });
}));

module.exports = router;
