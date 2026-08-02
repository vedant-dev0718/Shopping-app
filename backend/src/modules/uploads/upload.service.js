const fs = require('fs');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');

const env = require('../../config/env');
const AppError = require('../../utils/AppError');

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret
});

const ensureCloudinaryConfigured = () => {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new AppError('Cloudinary upload is not configured', 500);
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
  ensureCloudinaryConfigured();

  if (!file) {
    throw new AppError('Video file is required', 400);
  }

  try {
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
  ensureCloudinaryConfigured();

  if (!file) {
    throw new AppError('Image file is required', 400);
  }

  try {
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
