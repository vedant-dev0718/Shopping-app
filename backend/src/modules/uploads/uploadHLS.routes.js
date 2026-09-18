const express = require('express');
const multer = require('multer');
const os = require('os');

const { authenticate } = require('../../middleware/auth.middleware');
const { requireSeller, requireBuyerOrSeller } = require('../../middleware/role.middleware');
const { handleUploadError } = require('../../middleware/uploadError.middleware');
const {
    uploadReelVideo,
    getTranscodingStatus,
    uploadProductImagesOptimized,
    uploadAvatarOptimized,
    uploadStoreBannerOptimized,
    getHLSPlaybackUrl
} = require('./uploadHLS.controller');

const router = express.Router();

// Multer configuration for video uploads (500MB max)
const videoUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, os.tmpdir());
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${uniqueSuffix}-${file.originalname}`);
        }
    }),
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['video/mp4', 'video/quicktime', 'video/mpeg', 'video/webm'];
        if (allowed.includes(file.mimetype)) {
            return cb(null, true);
        }
        cb(new Error(`File type ${file.mimetype} not supported. Use MP4, MOV, or WebM.`));
    }
});

// Multer configuration for image uploads
const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            return cb(null, true);
        }
        cb(new Error(`File type ${file.mimetype} not supported. Use JPEG, PNG, WebP, or GIF.`));
    }
});

const multiImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            return cb(null, true);
        }
        cb(new Error(`File type ${file.mimetype} not supported. Use JPEG, PNG, WebP, or GIF.`));
    }
});

/**
 * REEL UPLOADS (HLS Transcoding)
 */

// POST /api/uploads/reel-video
// Upload reel video for HLS transcoding
// Returns: { transcodingJobId, jobStatus: 'SUBMITTED', pollingUrl: '/api/uploads/media/{id}/status' }
router.post(
    '/reel-video',
    authenticate,
    requireSeller,
    videoUpload.single('video'),
    handleUploadError,
    uploadReelVideo
);

// GET /api/uploads/media/:mediaRecordId/status
// Poll transcoding job status and get HLS manifest URL
router.get(
    '/media/:mediaRecordId/status',
    authenticate,
    getTranscodingStatus
);

// GET /api/uploads/media/:mediaRecordId/hls-manifest
// Get signed HLS manifest URL for playback
router.get(
    '/media/:mediaRecordId/hls-manifest',
    authenticate,
    getHLSPlaybackUrl
);

/**
 * PRODUCT IMAGES (Optimized)
 */

// POST /api/uploads/product-images
// Upload up to 5 product images with automatic optimization
// Returns: { imageUrls: [...], variants: [...] }
router.post(
    '/product-images',
    authenticate,
    requireSeller,
    multiImageUpload.array('images', 5),
    handleUploadError,
    uploadProductImagesOptimized
);

/**
 * AVATAR UPLOADS (Optimized)
 */

// POST /api/uploads/avatar
// Upload and optimize avatar (256px)
// Returns: { imageUrl (WebP), imageUrlFallback (JPEG), thumbnailUrl }
router.post(
    '/avatar',
    authenticate,
    imageUpload.single('image'),
    handleUploadError,
    uploadAvatarOptimized
);

/**
 * STORE BANNER UPLOADS (Optimized)
 */

// POST /api/uploads/store-banner
// Upload and optimize store banner
// Returns: { imageUrl (WebP), imageUrlFallback (JPEG) }
router.post(
    '/store-banner',
    authenticate,
    requireSeller,
    imageUpload.single('image'),
    handleUploadError,
    uploadStoreBannerOptimized
);

module.exports = router;
