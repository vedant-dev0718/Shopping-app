const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const uploadService = require('./upload.service');

const uploadVideo = asyncHandler(async (req, res) => {
  const data = await uploadService.uploadVideo({
    file: req.file,
    sellerId: req.user.id
  });

  return successResponse(res, {
    statusCode: 201,
    message: 'Video uploaded successfully',
    data
  });
});

const uploadImage = asyncHandler(async (req, res) => {
  const data = await uploadService.uploadImage({
    file: req.file,
    sellerId: req.user.id
  });

  return successResponse(res, {
    statusCode: 201,
    message: 'Image uploaded successfully',
    data
  });
});

module.exports = {
  uploadVideo,
  uploadImage
};
