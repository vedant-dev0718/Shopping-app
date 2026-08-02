const uploadRoutes = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const { requireSeller } = require('../../middleware/role.middleware');
const uploadController = require('./upload.controller');
const { uploadVideo, uploadImage, handleUploadError } = require('./upload.middleware');

uploadRoutes.post(
  '/video',
  authenticate,
  requireSeller,
  uploadVideo,
  handleUploadError,
  uploadController.uploadVideo
);

uploadRoutes.post(
  '/image',
  authenticate,
  requireSeller,
  uploadImage,
  handleUploadError,
  uploadController.uploadImage
);

module.exports = uploadRoutes;
