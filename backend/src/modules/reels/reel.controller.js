const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const reelService = require('./reel.service');
const env = require('../../config/env');

// Rewrite S3 Express URLs and old encoded proxy URLs to slash-based proxy URLs for HLS playback
const rewriteReelVideoUrl = (req, reel) => {
  if (!reel || !reel.videoUrl) return reel;
  const url = reel.videoUrl;
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  // Already a proxy URL with encoded slashes — decode to slash-based
  const encodedProxyPrefix = `${baseUrl}/api/uploads/media/`;
  if (url.startsWith(encodedProxyPrefix)) {
    const rawKey = decodeURIComponent(url.slice(encodedProxyPrefix.length));
    const safePath = rawKey.split('/').map(encodeURIComponent).join('/');
    return { ...reel.toObject ? reel.toObject() : reel, videoUrl: `${encodedProxyPrefix}${safePath}` };
  }

  // S3 Express URL — rewrite to proxy
  const s3ExpressBase = env.awsS3PublicBaseUrl || '';
  if (url.startsWith('https://') && (url.includes('s3express') || url.includes('amazonaws.com')) && url.includes(env.awsS3Bucket || '')) {
    const bucketUrl = s3ExpressBase ? `${s3ExpressBase.replace(/\/$/, '')}/` : `https://${env.awsS3Bucket}.s3express-use2-az2.us-east-2.amazonaws.com/`;
    const objectKey = url.startsWith(bucketUrl) ? url.slice(bucketUrl.length) : url.split('.amazonaws.com/').pop();
    const safePath = objectKey.split('/').map(encodeURIComponent).join('/');
    return { ...reel.toObject ? reel.toObject() : reel, videoUrl: `${encodedProxyPrefix}${safePath}` };
  }

  return reel.toObject ? reel.toObject() : reel;
};

const listReels = asyncHandler(async (req, res) => {
  const reels = await reelService.getPublicReels(req.query, req.user);
  const rewritten = reels.map(r => rewriteReelVideoUrl(req, r));

  return successResponse(res, {
    message: 'Reels fetched successfully',
    data: rewritten
  });
});

const getReel = asyncHandler(async (req, res) => {
  const reel = await reelService.getPublicReelById(req.params.id, req.user);

  return successResponse(res, {
    message: 'Reel fetched successfully',
    data: rewriteReelVideoUrl(req, reel)
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
