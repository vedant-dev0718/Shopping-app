const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const trendingService = require('./trending.service');

const getTrendingStores = asyncHandler(async (req, res) => {
  const stores = await trendingService.getTrendingStores(req.query, req.user);

  return successResponse(res, {
    message: 'Trending stores fetched successfully',
    data: stores
  });
});

const getTrendingRegions = asyncHandler(async (req, res) => {
  const regions = await trendingService.getTrendingRegions(req.query);

  return successResponse(res, {
    message: 'Trending regions fetched successfully',
    data: regions
  });
});

const getTrendingHashtags = asyncHandler(async (req, res) => {
  const hashtags = await trendingService.getTrendingHashtags(req.query);

  return successResponse(res, {
    message: 'Trending hashtags fetched successfully',
    data: hashtags
  });
});

const getTrendingProducts = asyncHandler(async (req, res) => {
  const products = await trendingService.getTrendingProducts(req.query, req.user);

  return successResponse(res, {
    message: 'Trending products fetched successfully',
    data: products
  });
});

module.exports = {
  getTrendingStores,
  getTrendingRegions,
  getTrendingHashtags,
  getTrendingProducts
};
