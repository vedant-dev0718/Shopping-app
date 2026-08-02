const router = require('express').Router();

const adminAnalyticsController = require('./adminAnalytics.controller');

router.get('/overview', adminAnalyticsController.overview);
router.get('/sales-trend', adminAnalyticsController.salesTrend);
router.get('/payment-methods', adminAnalyticsController.paymentMethods);
router.get('/sellers', adminAnalyticsController.sellers);
router.get('/products', adminAnalyticsController.products);
router.get('/reels', adminAnalyticsController.reels);
router.get('/regions', adminAnalyticsController.regions);
router.get('/payouts', adminAnalyticsController.payouts);
router.get('/refunds-returns', adminAnalyticsController.refundsReturns);
router.get('/support-moderation', adminAnalyticsController.supportModeration);

module.exports = router;
