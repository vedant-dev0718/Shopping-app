const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const uploadService = require('./upload.service');

const resolveBaseUrl = (req) => {
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto ? forwardedProto.split(',')[0] : req.protocol;
  return `${protocol}://${req.get('host')}`;
};

const buildMediaProxyUrl = (req, objectKey) => {
  return `${resolveBaseUrl(req)}/api/uploads/media/${encodeURIComponent(objectKey)}`;
};

const withMediaProxyUrls = (req, data) => {
  if (!data || data.storageProvider !== 's3') {
    return data;
  }

  const patched = { ...data };

  if (patched.objectKey) {
    const proxyUrl = buildMediaProxyUrl(req, patched.objectKey);
    if (patched.imageUrl) patched.imageUrl = proxyUrl;
    if (patched.videoUrl) patched.videoUrl = proxyUrl;
    if (patched.thumbnailUrl) patched.thumbnailUrl = proxyUrl;
    if (patched.avatarUrl) patched.avatarUrl = proxyUrl;
    if (patched.bannerUrl) patched.bannerUrl = proxyUrl;
  }

  if (Array.isArray(patched.imageUrls) && Array.isArray(patched.objectKeys) && patched.objectKeys.length > 0) {
    patched.imageUrls = patched.objectKeys.map((key) => buildMediaProxyUrl(req, key));
  }

  return patched;
};

const uploadVideo = asyncHandler(async (req, res) => {
  const data = withMediaProxyUrls(req, await uploadService.uploadVideo({
    file: req.file,
    sellerId: req.user.id
  }));

  return successResponse(res, {
    statusCode: 201,
    message: 'Video uploaded successfully',
    data
  });
});

const uploadImage = asyncHandler(async (req, res) => {
  const data = withMediaProxyUrls(req, await uploadService.uploadImage({
    file: req.file,
    sellerId: req.user.id
  }));

  return successResponse(res, {
    statusCode: 201,
    message: 'Image uploaded successfully',
    data
  });
});

const uploadProductImages = asyncHandler(async (req, res) => {
  const data = withMediaProxyUrls(req, await uploadService.uploadProductImages({
    files: req.files,
    sellerId: req.user.id
  }));

  return successResponse(res, {
    statusCode: 201,
    message: 'Product images uploaded successfully',
    data
  });
});

const uploadAvatar = asyncHandler(async (req, res) => {
  const data = withMediaProxyUrls(req, await uploadService.uploadAvatar({
    file: req.file,
    userId: req.user.id,
    role: req.user.role
  }));

  return successResponse(res, {
    statusCode: 201,
    message: 'Avatar uploaded successfully',
    data
  });
});

const uploadStoreBanner = asyncHandler(async (req, res) => {
  const data = withMediaProxyUrls(req, await uploadService.uploadStoreBanner({
    file: req.file,
    sellerId: req.user.id
  }));

  return successResponse(res, {
    statusCode: 201,
    message: 'Store banner uploaded successfully',
    data
  });
});

const streamMediaObject = asyncHandler(async (req, res, next) => {
  const objectKey = req.params.objectKey || req.params[0];
  const media = await uploadService.getMediaObjectStream({ objectKey });

  const cacheControl = media.cacheControl || 'public, max-age=31536000, immutable';

  res.setHeader('Content-Type', media.contentType);
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Accept-Ranges', 'bytes');

  if (media.contentLength) {
    res.setHeader('Content-Length', media.contentLength);
  }

  if (media.etag) {
    res.setHeader('ETag', media.etag);
  }

  media.stream.on('error', next);
  media.stream.pipe(res);
});

module.exports = {
  uploadVideo,
  uploadImage,
  uploadProductImages,
  uploadAvatar,
  uploadStoreBanner,
  streamMediaObject
};
