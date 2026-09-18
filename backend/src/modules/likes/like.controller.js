const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const likeService = require('./like.service');

const likeReel = asyncHandler(async (req, res) => {
  const data = await likeService.likeReel(req.params.id, req.user);

  return successResponse(res, {
    message: 'Reel liked successfully',
    data
  });
});

const unlikeReel = asyncHandler(async (req, res) => {
  const data = await likeService.unlikeReel(req.params.id, req.user);

  return successResponse(res, {
    message: 'Reel unliked successfully',
    data
  });
});

module.exports = {
  likeReel,
  unlikeReel
};
