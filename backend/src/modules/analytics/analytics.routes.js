const analyticsRoutes = require('express').Router();
const sellerAnalyticsRoutes = require('express').Router();

const { optionalAuthenticate, authenticate } = require('../../middleware/auth.middleware');
const { requireSeller } = require('../../middleware/role.middleware');
const analyticsController = require('./analytics.controller');

analyticsRoutes.post('/events', optionalAuthenticate, analyticsController.createEvent);

sellerAnalyticsRoutes.use(authenticate, requireSeller);
sellerAnalyticsRoutes.get('/analytics/overview', analyticsController.getOverview);
sellerAnalyticsRoutes.get('/analytics/sales', analyticsController.getSales);
sellerAnalyticsRoutes.get('/analytics/commission', analyticsController.getCommission);
sellerAnalyticsRoutes.get('/analytics/payouts', analyticsController.getPayouts);
sellerAnalyticsRoutes.get('/analytics/summary', analyticsController.getSummary);
sellerAnalyticsRoutes.get('/analytics/reels', analyticsController.getReels);
sellerAnalyticsRoutes.get('/analytics/videos', analyticsController.getVideos);
sellerAnalyticsRoutes.get('/analytics/products', analyticsController.getProducts);
sellerAnalyticsRoutes.get('/dashboard', analyticsController.getDashboard);
sellerAnalyticsRoutes.get('/recent-uploads', analyticsController.getRecentUploads);
sellerAnalyticsRoutes.get('/intent-signals', analyticsController.getIntentSignals);

module.exports = {
  analyticsRoutes,
  sellerAnalyticsRoutes
};
