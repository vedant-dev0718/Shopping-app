const router = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const { requireSeller } = require('../../middleware/role.middleware');
const asyncHandler = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/apiResponse');
const sellerPayoutService = require('./sellerPayout.service');

router.use(authenticate, requireSeller);

router.get('/me/earnings', asyncHandler(async (req, res) => {
  const earnings = await sellerPayoutService.getSellerEarnings(req.user.id);

  return successResponse(res, {
    message: 'Seller earnings fetched successfully',
    data: earnings
  });
}));

module.exports = router;
