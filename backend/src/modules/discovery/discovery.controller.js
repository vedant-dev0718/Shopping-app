const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const discoveryService = require('./discovery.service');

const getFeed = asyncHandler(async (req, res) => {
  const feed = await discoveryService.getDiscoveryFeed(req.query, req.user);

  return successResponse(res, {
    message: 'Discovery feed fetched successfully',
    data: feed
  });
});

const getCategories = asyncHandler(async (_req, res) => {
  const categories = await discoveryService.getCategories();

  return successResponse(res, {
    message: 'Discovery categories fetched successfully',
    data: categories
  });
});

const getRegions = asyncHandler(async (_req, res) => {
  const regions = await discoveryService.getRegions();

  return successResponse(res, {
    message: 'Discovery regions fetched successfully',
    data: regions
  });
});

const getFeaturedStores = asyncHandler(async (req, res) => {
  const stores = await discoveryService.getFeaturedStores(req.query, req.user);

  return successResponse(res, {
    message: 'Featured stores fetched successfully',
    data: stores
  });
});

module.exports = {
  getFeed,
  getCategories,
  getRegions,
  getFeaturedStores
};
