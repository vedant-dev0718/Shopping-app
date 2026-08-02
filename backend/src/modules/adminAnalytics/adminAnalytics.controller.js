const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const adminAnalyticsService = require('./adminAnalytics.service');

const buildHandler = (serviceMethod, message) => asyncHandler(async (req, res) => {
  const data = await serviceMethod(req.query);

  return successResponse(res, {
    message,
    data
  });
});

module.exports = {
  overview: buildHandler(adminAnalyticsService.getOverview, 'Admin analytics overview fetched'),
  salesTrend: buildHandler(adminAnalyticsService.getSalesTrend, 'Admin sales trend fetched'),
  paymentMethods: buildHandler(adminAnalyticsService.getPaymentMethods, 'Admin payment methods fetched'),
  sellers: buildHandler(adminAnalyticsService.getSellerAnalytics, 'Admin seller analytics fetched'),
  products: buildHandler(adminAnalyticsService.getProductAnalytics, 'Admin product analytics fetched'),
  reels: buildHandler(adminAnalyticsService.getReelAnalytics, 'Admin reel analytics fetched'),
  regions: buildHandler(adminAnalyticsService.getRegionAnalytics, 'Admin region analytics fetched'),
  payouts: buildHandler(adminAnalyticsService.getPayoutAnalytics, 'Admin payout analytics fetched'),
  refundsReturns: buildHandler(adminAnalyticsService.getRefundReturnAnalytics, 'Admin refund and return analytics fetched'),
  supportModeration: buildHandler(adminAnalyticsService.getSupportModerationAnalytics, 'Admin support and moderation analytics fetched')
};
