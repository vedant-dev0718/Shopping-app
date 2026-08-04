const asyncHandler = require('../../middleware/asyncHandler.middleware');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const AppError = require('../../utils/AppError');
const {
    uploadRawVideoForTranscoding,
    getHLSManifestUrl,
    uploadProductImages,
    uploadAvatar,
    uploadStoreBanner
} = require('./uploadHLS.service');
const MediaTranscoding = require('./mediaTranscoding.model');

/**
 * POST /api/uploads/reel-video
 * Upload reel video for HLS transcoding
 * Returns transcoding job status and polling URL
 */
const uploadReelVideo = asyncHandler(async (req, res) => {
    const { id: sellerId } = req.user;

    if (!req.file) {
        return res.status(400).json(errorResponse('Video file is required', 400));
    }

    const result = await uploadRawVideoForTranscoding({
        file: req.file,
        sellerId
    });

    return res.status(202).json(successResponse(result, 'Video queued for transcoding', 202));
});

/**
 * GET /api/uploads/media/:mediaRecordId/status
 * Poll transcoding job status and get HLS manifest URL when ready
 */
const getTranscodingStatus = asyncHandler(async (req, res) => {
    const { mediaRecordId } = req.params;
    const { id: sellerId } = req.user;

    const mediaRecord = await MediaTranscoding.findById(mediaRecordId);

    if (!mediaRecord) {
        return res.status(404).json(errorResponse('Media record not found', 404));
    }

    if (mediaRecord.sellerId.toString() !== sellerId) {
        return res.status(403).json(errorResponse('Access denied', 403));
    }

    const status = {
        mediaRecordId,
        jobStatus: mediaRecord.jobStatus,
        progress: mediaRecord.transcodingProgress,
        createdAt: mediaRecord.createdAt,
        updatedAt: mediaRecord.updatedAt
    };

    // If complete, get HLS manifest URL
    if (mediaRecord.jobStatus === 'COMPLETE') {
        const manifestInfo = await getHLSManifestUrl({
            mediaRecordId,
            sellerId
        });

        return res.status(200).json(successResponse(
            {
                ...status,
                ...manifestInfo
            },
            'Transcoding complete',
            200
        ));
    }

    // If error, return error details
    if (mediaRecord.jobStatus === 'ERROR') {
        return res.status(202).json(successResponse(
            {
                ...status,
                errorCode: mediaRecord.jobErrorCode,
                errorMessage: mediaRecord.jobErrorMessage,
                message: 'Transcoding failed. Please try again.'
            },
            'Transcoding error',
            202
        ));
    }

    // Still processing
    return res.status(202).json(successResponse(
        {
            ...status,
            message: `Video is ${mediaRecord.jobStatus.toLowerCase()}...`
        },
        'Transcoding in progress',
        202
    ));
});

/**
 * POST /api/uploads/product-images
 * Upload and optimize product images (up to 5)
 * Returns WebP URLs with JPEG fallback
 */
const uploadProductImagesOptimized = asyncHandler(async (req, res) => {
    const { id: sellerId } = req.user;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json(errorResponse('At least one image is required', 400));
    }

    const result = await uploadProductImages({
        files: req.files,
        sellerId
    });

    return res.status(201).json(successResponse(result, 'Product images uploaded and optimized'));
});

/**
 * POST /api/uploads/avatar
 * Upload and optimize avatar (256px)
 * Returns WebP with JPEG fallback
 */
const uploadAvatarOptimized = asyncHandler(async (req, res) => {
    const { id: userId, role } = req.user;

    if (!req.file) {
        return res.status(400).json(errorResponse('Image file is required', 400));
    }

    const result = await uploadAvatar({
        file: req.file,
        userId,
        role
    });

    return res.status(201).json(successResponse(result, 'Avatar uploaded and optimized'));
});

/**
 * POST /api/uploads/store-banner
 * Upload and optimize store banner
 * Returns WebP with JPEG fallback
 */
const uploadStoreBannerOptimized = asyncHandler(async (req, res) => {
    const { id: sellerId } = req.user;

    if (!req.file) {
        return res.status(400).json(errorResponse('Image file is required', 400));
    }

    const result = await uploadStoreBanner({
        file: req.file,
        sellerId
    });

    return res.status(201).json(successResponse(result, 'Banner uploaded and optimized'));
});

/**
 * GET /api/uploads/media/:mediaRecordId/hls-manifest
 * Get signed HLS manifest URL directly (for embedded players)
 */
const getHLSPlaybackUrl = asyncHandler(async (req, res) => {
    const { mediaRecordId } = req.params;
    const { id: sellerId } = req.user;

    const result = await getHLSManifestUrl({
        mediaRecordId,
        sellerId
    });

    return res.status(200).json(successResponse(result, 'HLS manifest URL'));
});

module.exports = {
    uploadReelVideo,
    getTranscodingStatus,
    uploadProductImagesOptimized,
    uploadAvatarOptimized,
    uploadStoreBannerOptimized,
    getHLSPlaybackUrl
};
