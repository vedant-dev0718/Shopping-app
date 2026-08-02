const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const reelService = require('./reel.service');

const listReels = asyncHandler(async (req, res) => {
  const reels = await reelService.getPublicReels(req.query, req.user);

  return successResponse(res, {
    message: 'Reels fetched successfully',
    data: reels
  });
});

const getReel = asyncHandler(async (req, res) => {
  const reel = await reelService.getPublicReelById(req.params.id, req.user);

  return successResponse(res, {
    message: 'Reel fetched successfully',
    data: reel
  });
});

const recordReelView = asyncHandler(async (req, res) => {
  const data = await reelService.recordReelView(req.params.id, req.user);

  return successResponse(res, {
    message: 'Reel view recorded successfully',
    data
  });
});

const getTaggedProducts = asyncHandler(async (req, res) => {
  const products = await reelService.getTaggedProducts(req.params.id, req.user);

  return successResponse(res, {
    message: 'Tagged products fetched successfully',
    data: products
  });
});

const createSellerReel = asyncHandler(async (req, res) => {
  const reel = await reelService.createSellerReel(req.user, req.body);

  return successResponse(res, {
    statusCode: 201,
    message: 'Reel created successfully',
    data: reel
  });
});

const listSellerReels = asyncHandler(async (req, res) => {
  const reels = await reelService.getSellerReels(req.user.id);

  return successResponse(res, {
    message: 'Seller reels fetched successfully',
    data: reels
  });
});

const updateSellerReel = asyncHandler(async (req, res) => {
  const reel = await reelService.updateSellerReel(req.user, req.params.id, req.body);

  return successResponse(res, {
    message: 'Reel updated successfully',
    data: reel
  });
});

const deleteSellerReel = asyncHandler(async (req, res) => {
  const data = await reelService.deleteSellerReel(req.user, req.params.id);

  return successResponse(res, {
    message: 'Reel deleted successfully',
    data
  });
});

module.exports = {
  listReels,
  getReel,
  recordReelView,
  getTaggedProducts,
  listSellerReels,
  createSellerReel,
  updateSellerReel,
  deleteSellerReel
};
