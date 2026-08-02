const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');

const env = require('../../config/env');
const AppError = require('../../utils/AppError');

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
      const result = await uploadToS3({
        file,
        sellerId,
        folder: `notwhat/sellers/${sellerId}/reels`,
        contentType: file.mimetype
      });

      return {
        videoUrl: result.url,
        thumbnailUrl: result.url,
        publicId: result.objectKey,
        duration: 0,
        fileSize: file.size,
        mimeType: file.mimetype
      };
    }

    const result = await uploadVideoBufferToCloudinary(file, sellerId);
    const eagerThumbnail = result.eager && result.eager[0] && result.eager[0].secure_url;

    return {
      videoUrl: result.secure_url,
      thumbnailUrl: eagerThumbnail || result.secure_url.replace(/\.[^.]+$/, '.jpg'),
      publicId: result.public_id,
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
    if (isS3Configured()) {
      const result = await uploadToS3({
        file,
        sellerId,
        folder: `notwhat/sellers/${sellerId}/products`,
        contentType: file.mimetype
      });

      return {
        imageUrl: result.url,
        publicId: result.objectKey,
        fileSize: file.size,
        mimeType: file.mimetype
      };
    }

    const result = await uploadImageBufferToCloudinary(file, sellerId);

    return {
      imageUrl: result.secure_url,
      publicId: result.public_id,
      fileSize: file.size,
      mimeType: file.mimetype
    };
  } finally {
    await cleanupTempFile(file);
  }
};

module.exports = {
  uploadVideo,
  uploadImage
};
