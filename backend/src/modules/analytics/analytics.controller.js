const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const analyticsService = require('./analytics.service');
const financeService = require('../finance/finance.service');

const createEvent = asyncHandler(async (req, res) => {
  const event = await analyticsService.trackEvent({
    ...req.body,
    userId: req.user ? req.user.id : req.body.userId
  });

  return successResponse(res, {
    statusCode: 201,
    message: 'Analytics event tracked successfully',
    data: event
  });
});

const getSummary = asyncHandler(async (req, res) => {
  const summary = await analyticsService.getSummary(req.user.id);

  return successResponse(res, {
    message: 'Seller analytics summary fetched successfully',
    data: summary
  });
});

const getVideos = asyncHandler(async (req, res) => {
  const videos = await analyticsService.getVideoAnalytics(req.user.id);

  return successResponse(res, {
    message: 'Seller video analytics fetched successfully',
    data: videos
  });
});

const getProducts = asyncHandler(async (req, res) => {
  const products = await financeService.topProductsForSeller(req.user.id, req.query);

  return successResponse(res, {
    message: 'Seller product analytics fetched successfully',
    data: products
  });
});

const getOverview = asyncHandler(async (req, res) => {
  const overview = await financeService.getSellerAnalyticsOverview(req.user.id, req.query);

  return successResponse(res, {
    message: 'Seller finance analytics overview fetched successfully',
    data: overview
  });
});

const getSales = asyncHandler(async (req, res) => {
  const sales = await financeService.getSalesTrend(req.user.id, req.query, req.query.interval);

  return successResponse(res, {
    message: 'Seller sales trend fetched successfully',
    data: sales
  });
});

const getCommission = asyncHandler(async (req, res) => {
  const commission = await financeService.getSellerCommission(req.user.id, req.query);

  return successResponse(res, {
    message: 'Seller commission analytics fetched successfully',
    data: commission
  });
});

const getPayouts = asyncHandler(async (req, res) => {
  const payouts = await financeService.getSellerPayouts(req.user.id, req.query);

  return successResponse(res, {
    message: 'Seller payout analytics fetched successfully',
    data: payouts
  });
});

const getReels = asyncHandler(async (req, res) => {
  const reels = await financeService.topReelsForSeller(req.user.id, req.query);

  return successResponse(res, {
    message: 'Seller reel analytics fetched successfully',
    data: reels
  });
});

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await analyticsService.getDashboard(req.user.id);

  return successResponse(res, {
    message: 'Seller dashboard fetched successfully',
    data: dashboard
  });
});

const getRecentUploads = asyncHandler(async (req, res) => {
  const uploads = await analyticsService.getRecentUploads(req.user.id);

  return successResponse(res, {
    message: 'Seller recent uploads fetched successfully',
    data: uploads
  });
});

const getIntentSignals = asyncHandler(async (req, res) => {
  const signals = await analyticsService.getIntentSignals(req.user.id);

  return successResponse(res, {
    message: 'Seller intent signals fetched successfully',
    data: signals
  });
});

module.exports = {
  createEvent,
  getOverview,
  getSales,
  getCommission,
  getPayouts,
  getReels,
  getSummary,
  getVideos,
  getProducts,
  getDashboard,
  getRecentUploads,
  getIntentSignals
};
