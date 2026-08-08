const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');
const sharp = require('sharp');

const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const uploadHLSService = require('./uploadHLS.service');

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret
});

const isS3Configured = () => {
  return Boolean(
    env.awsS3Bucket
    && env.awsRegion
    && env.awsAccessKeyId
    && env.awsSecretAccessKey
  );
};

const isCloudinaryConfigured = () => {
  return Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);
};

const ensureUploadProviderConfigured = () => {
  if (!isS3Configured() && !isCloudinaryConfigured()) {
    throw new AppError('Upload provider is not configured. Add AWS S3 or Cloudinary credentials.', 500);
  }
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

/*
  S3 folder layout
  ─────────────────────────────────────────────────────────
  notwhat/
    sellers/{sellerId}/
      products/     ← product images (up to 5 per product)
      reels/        ← reel video files
      avatars/      ← seller profile photo
      banners/      ← store banner / cover image
    buyers/{userId}/
      avatars/      ← buyer profile photo
  ─────────────────────────────────────────────────────────
*/

// Resize to max 1200×1500 and encode as progressive JPEG 80 before S3/Cloudinary transfer.
const compressImage = async (file) => {
  const input = file.path || file.buffer;
  return sharp(input)
    .resize({ width: 1200, height: 1500, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();
};

const uploadBufferToS3 = async ({ buffer, folder }) => {
  const objectKey = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const command = new PutObjectCommand({
    Bucket: env.awsS3Bucket,
    Key: objectKey,
    Body: buffer,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000'
  });
  await getS3Client().send(command);
  return { objectKey, url: toPublicS3Url(objectKey) };
};

const uploadToS3 = async ({ file, sellerId, folder, contentType }) => {
  const extension = path.extname(file.originalname || file.filename || '');
  const objectKey = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
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

const getMediaObjectStream = async ({ objectKey }) => {
  ensureUploadProviderConfigured();

  if (!isS3Configured()) {
    throw new AppError('S3 is not configured for media proxying.', 500);
  }

  if (!objectKey || typeof objectKey !== 'string') {
    throw new AppError('A valid media object key is required.', 400);
  }

  const normalizedKey = decodeURIComponent(objectKey).trim();

  if (!normalizedKey.startsWith('notwhat/') || normalizedKey.includes('..')) {
    throw new AppError('Invalid media object key.', 400);
  }

  const command = new GetObjectCommand({
    Bucket: env.awsS3Bucket,
    Key: normalizedKey
  });

  const client = getS3Client();

  try {
    const result = await client.send(command);
    return {
      stream: result.Body,
      contentType: result.ContentType || 'application/octet-stream',
      cacheControl: result.CacheControl || 'public, max-age=31536000',
      contentLength: result.ContentLength,
      etag: result.ETag
    };
  } catch (error) {
    if (error && (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404)) {
      throw new AppError('Media not found.', 404);
    }

    throw error;
  }
};

const uploadVideoBufferToCloudinary = (file, sellerId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: `notwhat/sellers/${sellerId}/reels`,
        eager: [
          {
            width: 720,
            height: 1280,
            crop: 'fill',
            format: 'jpg'
          }
        ],
        eager_async: false
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve(result);
      }
    );

    if (file.path) {
      fs.createReadStream(file.path).pipe(uploadStream);
    } else {
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    }
  });
};

const uploadImageBufferToCloudinary = (file, sellerId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: `notwhat/sellers/${sellerId}/products`,
        transformation: [
          {
            width: 1200,
            height: 1500,
            crop: 'limit',
            quality: 'auto',
            fetch_format: 'auto'
          }
        ]
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve(result);
      }
    );

    if (file.path) {
      fs.createReadStream(file.path).pipe(uploadStream);
    } else {
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    }
  });
};

const cleanupTempFile = async (file) => {
  if (!file || !file.path) {
    return;
  }

  try {
    await fs.promises.unlink(file.path);
  } catch (_error) {
    // Best effort cleanup. Upload success/failure should not depend on temp deletion.
  }
};

const uploadVideo = async ({ file, sellerId }) => {
  ensureUploadProviderConfigured();

  if (!file) {
    throw new AppError('Video file is required', 400);
  }

  try {
    if (isS3Configured()) {
      const hls = await uploadHLSService.uploadRawVideoForTranscoding({ file, sellerId });
      // objectKey → manifestKey so withMediaProxyUrls rewrites videoUrl to the backend proxy
      return {
        videoUrl: hls.hlsManifestUrl || hls.sourceUrl || '',
        thumbnailUrl: hls.hlsManifestUrl || hls.sourceUrl || '',
        objectKey: hls.manifestKey,
        storageProvider: 's3',
        transcodingJobId: hls.transcodingJobId,
        mediaRecordId: hls.mediaRecordId,
        jobStatus: hls.jobStatus,
        fileSize: file.size,
        mimeType: file.mimetype
      };
    }

    // Fallback to Cloudinary for non-S3 storage
    const result = await uploadVideoBufferToCloudinary(file, sellerId);
    const eagerThumbnail = result.eager && result.eager[0] && result.eager[0].secure_url;

    return {
      videoUrl: result.secure_url,
      thumbnailUrl: eagerThumbnail || result.secure_url.replace(/\.[^.]+$/, '.jpg'),
      publicId: result.public_id,
      storageProvider: 'cloudinary',
      duration: result.duration || 0,
      fileSize: file.size,
      mimeType: file.mimetype
    };
  } finally {
    await cleanupTempFile(file);
  }
};

const uploadImage = async ({ file, sellerId }) => {
  ensureUploadProviderConfigured();

  if (!file) {
    throw new AppError('Image file is required', 400);
  }

  try {
    const compressed = await compressImage(file);

    if (isS3Configured()) {
      const result = await uploadBufferToS3({
        buffer: compressed,
        folder: `notwhat/sellers/${sellerId}/products`
      });
      return {
        imageUrl: result.url,
        publicId: result.objectKey,
        objectKey: result.objectKey,
        storageProvider: 's3',
        fileSize: compressed.length,
        mimeType: 'image/jpeg'
      };
    }

    // Pre-compress before Cloudinary so we upload fewer bytes (Cloudinary still transforms server-side)
    const result = await uploadImageBufferToCloudinary({ buffer: compressed }, sellerId);
    return {
      imageUrl: result.secure_url,
      publicId: result.public_id,
      storageProvider: 'cloudinary',
      fileSize: compressed.length,
      mimeType: 'image/jpeg'
    };
  } finally {
    await cleanupTempFile(file);
  }
};

const uploadProductImages = async ({ files, sellerId }) => {
  ensureUploadProviderConfigured();

  if (!files || files.length === 0) {
    throw new AppError('At least one image is required', 400);
  }

  try {
    const results = await Promise.all(
      files.map(async (file) => {
        const compressed = await compressImage(file);
        if (isS3Configured()) {
          const result = await uploadBufferToS3({
            buffer: compressed,
            folder: `notwhat/sellers/${sellerId}/products`
          });
          return { url: result.url, objectKey: result.objectKey };
        }
        const result = await uploadImageBufferToCloudinary({ buffer: compressed }, sellerId);
        return { url: result.secure_url, objectKey: null };
      })
    );

    return {
      imageUrls: results.map((item) => item.url),
      objectKeys: results.map((item) => item.objectKey).filter(Boolean),
      storageProvider: isS3Configured() ? 's3' : 'cloudinary',
      fileCount: results.length
    };
  } finally {
    await Promise.all(files.map(cleanupTempFile));
  }
};

const uploadAvatar = async ({ file, userId, role }) => {
  ensureUploadProviderConfigured();

  if (!file) {
    throw new AppError('Avatar image is required', 400);
  }

  const folder = role === 'seller'
    ? `notwhat/sellers/${userId}/avatars`
    : `notwhat/buyers/${userId}/avatars`;

  try {
    if (isS3Configured()) {
      const result = await uploadToS3({ file, sellerId: userId, folder, contentType: file.mimetype });
      return { avatarUrl: result.url, publicId: result.objectKey, objectKey: result.objectKey, storageProvider: 's3' };
    }

    const result = await uploadImageBufferToCloudinary(file, userId);
    return { avatarUrl: result.secure_url, publicId: result.public_id, storageProvider: 'cloudinary' };
  } finally {
    await cleanupTempFile(file);
  }
};

const uploadStoreBanner = async ({ file, sellerId }) => {
  ensureUploadProviderConfigured();

  if (!file) {
    throw new AppError('Banner image is required', 400);
  }

  try {
    if (isS3Configured()) {
      const result = await uploadToS3({
        file,
        sellerId,
        folder: `notwhat/sellers/${sellerId}/banners`,
        contentType: file.mimetype
      });
      return { bannerUrl: result.url, publicId: result.objectKey, objectKey: result.objectKey, storageProvider: 's3' };
    }

    const result = await uploadImageBufferToCloudinary(file, sellerId);
    return { bannerUrl: result.secure_url, publicId: result.public_id, storageProvider: 'cloudinary' };
  } finally {
    await cleanupTempFile(file);
  }
};

module.exports = {
  uploadVideo,
  uploadImage,
  uploadProductImages,
  uploadAvatar,
  uploadStoreBanner,
  getMediaObjectStream
};
