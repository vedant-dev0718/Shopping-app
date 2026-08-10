const uploadRoutes = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const { requireSeller } = require('../../middleware/role.middleware');
const uploadController = require('./upload.controller');
const { uploadVideo, uploadImage, handleUploadError } = require('./upload.middleware');
const multer = require('multer');
const os = require('os');
const path = require('path');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const AppError = require('../../utils/AppError');
const env = require('../../config/env');

const imageUploadMulti = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname || '')}`)
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new AppError('Only JPEG, PNG, or WebP images are supported', 400));
    }
    cb(null, true);
  }
});

const mediaReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Math.max(1, Number(env.uploadsMediaReadRateLimitPerMinute) || 120),
  keyGenerator: (req, _res) => `${ipKeyGenerator(req.ip)}:${req.path}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many media requests from this IP. Please retry shortly.'
  }
});

// Public media proxy endpoint for persisted S3 objects.
uploadRoutes.get('/media/:objectKey(*)', mediaReadLimiter, uploadController.streamMediaObject);
uploadRoutes.get('/remote-image', mediaReadLimiter, uploadController.proxyRemoteImage);

// reel video — seller only
uploadRoutes.post(
  '/video',
  authenticate,
  requireSeller,
  uploadVideo,
  handleUploadError,
  uploadController.uploadVideo
);

// single product image — seller only (legacy single-image path)
uploadRoutes.post(
  '/image',
  authenticate,
  requireSeller,
  uploadImage,
  handleUploadError,
  uploadController.uploadImage
);

// up to 5 product images in one request — seller only
uploadRoutes.post(
  '/product-images',
  authenticate,
  requireSeller,
  imageUploadMulti.array('images', 5),
  handleUploadError,
  uploadController.uploadProductImages
);

// buyer or seller avatar
uploadRoutes.post(
  '/avatar',
  authenticate,
  uploadImage,
  handleUploadError,
  uploadController.uploadAvatar
);

// store banner / cover image — seller only
uploadRoutes.post(
  '/store-banner',
  authenticate,
  requireSeller,
  uploadImage,
  handleUploadError,
  uploadController.uploadStoreBanner
);

module.exports = uploadRoutes;
