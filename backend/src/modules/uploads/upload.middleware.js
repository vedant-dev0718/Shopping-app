const multer = require('multer');
const os = require('os');
const path = require('path');

const AppError = require('../../utils/AppError');

const allowedVideoMimeTypes = new Set([
  'video/mp4',
  'video/quicktime',
  'video/mov'
]);

const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const createUpload = ({ allowedMimeTypes, maxFileSize, invalidMessage }) => multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || '');
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
      callback(null, safeName);
    }
  }),
  limits: {
    fileSize: maxFileSize
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new AppError(invalidMessage, 400));
    }

    return callback(null, true);
  }
});

const videoUpload = createUpload({
  allowedMimeTypes: allowedVideoMimeTypes,
  maxFileSize: 100 * 1024 * 1024,
  invalidMessage: 'Only MP4, MOV, or QuickTime video files are supported'
});

const imageUpload = createUpload({
  allowedMimeTypes: allowedImageMimeTypes,
  maxFileSize: 10 * 1024 * 1024,
  invalidMessage: 'Only JPEG, PNG, or WebP image files are supported'
});

const handleUploadError = (error, _req, _res, next) => {
  if (!error) {
    return next();
  }

  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return next(new AppError('Uploaded file is too large', 400));
  }

  return next(error);
};

module.exports = {
  uploadVideo: videoUpload.single('video'),
  uploadImage: imageUpload.single('image'),
  handleUploadError
};
