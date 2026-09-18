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
        return errorResponse(res, { statusCode: 400, message: 'Video file is required' });
    }

    const result = await uploadRawVideoForTranscoding({
        file: req.file,
        sellerId
    });

    return successResponse(res, { statusCode: 202, message: 'Video transcoded to HLS', data: result });
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
        return errorResponse(res, { statusCode: 404, message: 'Media record not found' });
    }

    if (mediaRecord.sellerId.toString() !== sellerId) {
        return errorResponse(res, { statusCode: 403, message: 'Access denied' });
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

        return successResponse(res, { statusCode: 200, message: 'Transcoding complete', data: { ...status, ...manifestInfo } });
    }

    // If error, return error details
    if (mediaRecord.jobStatus === 'ERROR') {
        return successResponse(res, { statusCode: 202, message: 'Transcoding error', data: { ...status, errorCode: mediaRecord.jobErrorCode, errorMessage: mediaRecord.jobErrorMessage } });
    }

    // Still processing
    return successResponse(res, { statusCode: 202, message: `Video is ${mediaRecord.jobStatus.toLowerCase()}...`, data: status });
});

/**
 * POST /api/uploads/product-images
 * Upload and optimize product images (up to 5)
 * Returns WebP URLs with JPEG fallback
 */
const uploadProductImagesOptimized = asyncHandler(async (req, res) => {
    const { id: sellerId } = req.user;

    if (!req.files || req.files.length === 0) {
        return errorResponse(res, { statusCode: 400, message: 'At least one image is required' });
    }

    const result = await uploadProductImages({
        files: req.files,
        sellerId
    });

    return successResponse(res, { statusCode: 201, message: 'Product images uploaded and optimized', data: result });
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

    return successResponse(res, { statusCode: 201, message: 'Avatar uploaded and optimized', data: result });
});

/**
 * POST /api/uploads/store-banner
 * Upload and optimize store banner
 * Returns WebP with JPEG fallback
 */
const uploadStoreBannerOptimized = asyncHandler(async (req, res) => {
    const { id: sellerId } = req.user;

    if (!req.file) {
        return errorResponse(res, { statusCode: 400, message: 'Image file is required' });
    }

    const result = await uploadStoreBanner({
        file: req.file,
        sellerId
    });

    return successResponse(res, { statusCode: 201, message: 'Banner uploaded and optimized', data: result });
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

    return successResponse(res, { statusCode: 200, message: 'HLS manifest URL', data: result });
});

module.exports = {
    uploadReelVideo,
    getTranscodingStatus,
    uploadProductImagesOptimized,
    uploadAvatarOptimized,
    uploadStoreBannerOptimized,
    getHLSPlaybackUrl
};
