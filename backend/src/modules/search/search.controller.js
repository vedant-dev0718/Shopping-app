const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const searchService = require('./search.service');

const globalSearch = asyncHandler(async (req, res) => {
  const results = await searchService.globalSearch(req.query, req.user);

  return successResponse(res, {
    message: 'Global search results fetched successfully',
    data: results
  });
});

const searchStores = asyncHandler(async (req, res) => {
  const stores = await searchService.searchStores(req.query, req.user);

  return successResponse(res, {
    message: 'Store search results fetched successfully',
    data: stores
  });
});

const searchProducts = asyncHandler(async (req, res) => {
  const products = await searchService.searchProducts(req.query, req.user);

  return successResponse(res, {
    message: 'Product search results fetched successfully',
    data: products
  });
});

const searchReels = asyncHandler(async (req, res) => {
  const reels = await searchService.searchReels(req.query, req.user);

  return successResponse(res, {
    message: 'Reel search results fetched successfully',
    data: reels
  });
});

module.exports = {
  globalSearch,
  searchStores,
  searchProducts,
  searchReels
};
