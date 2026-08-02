const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const recommendationsService = require('./recommendations.service');

const getProducts = asyncHandler(async (req, res) => {
  const products = await recommendationsService.getRecommendedProducts(req.user.id, req.query, req.user);

  return successResponse(res, {
    message: 'Recommended products fetched successfully',
    data: products
  });
});

const getReels = asyncHandler(async (req, res) => {
  const reels = await recommendationsService.getRecommendedReels(req.user.id, req.query, req.user);

  return successResponse(res, {
    message: 'Recommended reels fetched successfully',
    data: reels
  });
});

module.exports = {
  getProducts,
  getReels
};
