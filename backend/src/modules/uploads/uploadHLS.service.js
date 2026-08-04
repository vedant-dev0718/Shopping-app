const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const { createHLSTranscodingJob, isMediaConvertConfigured } = require('../../utils/mediaTranscoding');
const { optimizeImage } = require('../../utils/imageOptimization');
const MediaTranscoding = require('./mediaTranscoding.model');

const isS3Configured = () => {
    return Boolean(
        env.awsS3Bucket
        && env.awsRegion
        && env.awsAccessKeyId
        && env.awsSecretAccessKey
    );
};

const getS3Client = () => {
    const options = {
        region: env.awsRegion,
        credentials: {
            accessKeyId: env.awsAccessKeyId,
            secretAccessKey: env.awsSecretAccessKey
        }
    };

    if (env.awsS3Endpoint) {
        options.endpoint = env.awsS3Endpoint;
        options.forcePathStyle = env.awsS3ForcePathStyle;
    }

    return new S3Client(options);
};

const toPublicS3Url = (objectKey) => {
    if (env.awsS3PublicBaseUrl) {
        const base = env.awsS3PublicBaseUrl.replace(/\/$/, '');
        return `${base}/${objectKey}`;
    }

    if (env.awsS3Endpoint) {
        const endpoint = env.awsS3Endpoint.replace(/\/$/, '');
        if (env.awsS3ForcePathStyle) {
            return `${endpoint}/${env.awsS3Bucket}/${objectKey}`;
        }
        return `${endpoint}/${objectKey}`;
    }

    if (env.awsRegion === 'us-east-1') {
        return `https://${env.awsS3Bucket}.s3.amazonaws.com/${objectKey}`;
    }

    return `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/${objectKey}`;
};

const uploadToS3 = async ({ file, objectKey, contentType }) => {
    const body = file.path ? fs.createReadStream(file.path) : file.buffer;

    const command = new PutObjectCommand({
        Bucket: env.awsS3Bucket,
        Key: objectKey,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000'
    });

    const client = getS3Client();
    await client.send(command);

    return {
        objectKey,
        url: toPublicS3Url(objectKey)
    };
};

const uploadRawVideoForTranscoding = async ({ file, sellerId }) => {
    if (!isS3Configured()) {
        throw new AppError('S3 is not configured for video upload', 500);
    }

    if (!file) {
        throw new AppError('Video file is required', 400);
    }

    if (file.size > 500 * 1024 * 1024) {
        throw new AppError('Video file size cannot exceed 500MB', 413);
    }

    // Upload raw video to S3
    const timestamp = Date.now();
    const randomHash = Math.random().toString(36).slice(2, 8);
    const ext = path.extname(file.originalname);
    const sourceKey = `notwhat/sellers/${sellerId}/reels/raw/${timestamp}-${randomHash}${ext}`;

    const uploadResult = await uploadToS3({
        file,
        objectKey: sourceKey,
        contentType: file.mimetype
    });

    // Create output prefix for HLS segments
    const outputPrefix = `notwhat/sellers/${sellerId}/reels/hls/${timestamp}-${randomHash}`;

    // Queue MediaConvert job for HLS transcoding
    const s3InputPath = `s3://${env.awsS3Bucket}/${sourceKey}`;
    const s3OutputPath = `s3://${env.awsS3Bucket}/${outputPrefix}/`;

    try {
        const transcodingJob = await createHLSTranscodingJob({
            s3InputPath,
            s3OutputPath,
            videoMetadata: {
                originalFilename: file.originalname,
                uploadedSize: file.size
            }
        });

        // Save transcoding job record
        const mediaRecord = await MediaTranscoding.createTranscodingJob({
            contentType: 'reel',
            sellerId,
            sourceS3Key: sourceKey,
            sourceSize: file.size,
            sourceMetadata: {
                codec: file.mimetype,
                uploadedAt: new Date()
            },
            mediaConvertJobId: transcodingJob.jobId,
            outputS3Prefix: outputPrefix
        });

        return {
            transcodingJobId: transcodingJob.jobId,
            mediaRecordId: mediaRecord._id,
            jobStatus: 'SUBMITTED',
            sourceUrl: uploadResult.url,
            message: 'Video queued for HLS transcoding. Manifests will be available shortly.',
            estimatedTimeMinutes: 2,
            pollingUrl: `/api/uploads/media/${mediaRecord._id}/status`
        };
    } finally {
        // Best effort cleanup of temp file
        if (file.path) {
            try {
                await fs.promises.unlink(file.path);
            } catch (_e) {
                // Ignore
            }
        }
    }
};

const getHLSManifestUrl = async ({ mediaRecordId, sellerId }) => {
    const mediaRecord = await MediaTranscoding.findById(mediaRecordId).lean();

    if (!mediaRecord) {
        throw new AppError('Media record not found', 404);
    }

    if (mediaRecord.sellerId.toString() !== sellerId) {
        throw new AppError('Access denied', 403);
    }

    if (mediaRecord.jobStatus !== 'COMPLETE') {
        return {
            status: mediaRecord.jobStatus,
            progress: mediaRecord.transcodingProgress,
            hlsManifestUrl: null,
            message: `Video is ${mediaRecord.jobStatus.toLowerCase()}. Check back in a moment.`
        };
    }

    if (!mediaRecord.hlsManifestUrl) {
        throw new AppError('HLS manifest not generated', 500);
    }

    // Generate pre-signed URL for manifest (valid for 24 hours)
    const client = getS3Client();
    const manifestKey = `${mediaRecord.outputS3Prefix}/index.m3u8`;

    const command = new GetObjectCommand({
        Bucket: env.awsS3Bucket,
        Key: manifestKey
    });

    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 24 * 60 * 60 });

    return {
        status: 'COMPLETE',
        hlsManifestUrl: presignedUrl,
        variants: mediaRecord.variants || [
            { resolution: '720p', bitrate: 2500 },
            { resolution: '480p', bitrate: 1200 },
            { resolution: '360p', bitrate: 600 }
        ],
        message: 'Video is ready for playback'
    };
};

const uploadOptimizedImage = async ({ file, sellerId, folder, preset = 'mobile' }) => {
    if (!isS3Configured()) {
        throw new AppError('S3 is not configured for image upload', 500);
    }

    if (!file) {
        throw new AppError('Image file is required', 400);
    }

    if (file.size > 20 * 1024 * 1024) {
        throw new AppError('Image file size cannot exceed 20MB', 413);
    }

    try {
        // Optimize image to WebP and JPEG
        const optimized = await optimizeImage(file.buffer, file.originalname, {
            width: 1024,
            quality: 85,
            withThumbnail: true
        });

        const timestamp = Date.now();
        const randomHash = Math.random().toString(36).slice(2, 8);
        const basename = path.parse(file.originalname).name;
        const folderPath = `notwhat/sellers/${sellerId}/${folder}`;

        const results = {};

        // Upload WebP variant (primary)
        if (optimized.webp) {
            const webpKey = `${folderPath}/${basename}-${timestamp}.webp`;
            const webpFile = {
                buffer: optimized.webp.buffer,
                originalname: optimized.webp.filename,
                mimetype: 'image/webp',
                size: optimized.webp.buffer.length
            };
            const webpResult = await uploadToS3({
                file: webpFile,
                objectKey: webpKey,
                contentType: 'image/webp'
            });
            results.webp = webpResult.url;
        }

        // Upload JPEG variant (fallback for older clients)
        if (optimized.jpeg) {
            const jpegKey = `${folderPath}/${basename}-${timestamp}.jpg`;
            const jpegFile = {
                buffer: optimized.jpeg.buffer,
                originalname: optimized.jpeg.filename,
                mimetype: 'image/jpeg',
                size: optimized.jpeg.buffer.length
            };
            const jpegResult = await uploadToS3({
                file: jpegFile,
                objectKey: jpegKey,
                contentType: 'image/jpeg'
            });
            results.jpeg = jpegResult.url;
        }

        // Upload thumbnail if requested
        if (optimized.thumbnail) {
            const thumbKey = `${folderPath}/${basename}-thumb-${timestamp}.webp`;
            const thumbFile = {
                buffer: optimized.thumbnail.buffer,
                originalname: optimized.thumbnail.filename,
                mimetype: 'image/webp',
                size: optimized.thumbnail.buffer.length
            };
            const thumbResult = await uploadToS3({
                file: thumbFile,
                objectKey: thumbKey,
                contentType: 'image/webp'
            });
            results.thumbnail = thumbResult.url;
        }

        return {
            imageUrl: results.webp || results.jpeg, // Primary URL (WebP for modern clients)
            imageUrlFallback: results.jpeg, // Fallback (JPEG for older clients)
            thumbnailUrl: results.thumbnail,
            variants: {
                webp: results.webp,
                jpeg: results.jpeg,
                thumbnail: results.thumbnail
            },
            optimizationNotes: 'WebP primary format with JPEG fallback for compatibility'
        };
    } finally {
        // No temp file cleanup needed for buffer-based uploads
    }
};

const uploadProductImages = async ({ files, sellerId }) => {
    if (!files || files.length === 0) {
        throw new AppError('At least one image is required', 400);
    }

    const results = await Promise.all(
        files.slice(0, 5).map(file => uploadOptimizedImage({
            file,
            sellerId,
            folder: 'products'
        }))
    );

    return {
        imageUrls: results.map(r => r.imageUrl),
        variants: results,
        fileCount: results.length
    };
};

const uploadAvatar = async ({ file, userId, role }) => {
    if (!isS3Configured()) {
        throw new AppError('S3 is not configured for avatar upload', 500);
    }

    const folder = role === 'seller' ? 'sellers' : 'buyers';
    const userId_ = role === 'seller' ? userId : userId;

    return uploadOptimizedImage({
        file,
        sellerId: userId_,
        folder: `${folder}/${userId_}/avatars`,
        preset: 'avatar'
    });
};

const uploadStoreBanner = async ({ file, sellerId }) => {
    if (!isS3Configured()) {
        throw new AppError('S3 is not configured for banner upload', 500);
    }

    return uploadOptimizedImage({
        file,
        sellerId,
        folder: 'banners',
        preset: 'banner'
    });
};

module.exports = {
    uploadRawVideoForTranscoding,
    getHLSManifestUrl,
    uploadOptimizedImage,
    uploadProductImages,
    uploadAvatar,
    uploadStoreBanner,
    isS3Configured
};
