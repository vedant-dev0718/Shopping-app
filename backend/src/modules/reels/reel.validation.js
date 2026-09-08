const { body, param, query } = require('express-validator');

const isValidUrl = (value) => /^https?:\/\/.+/.test(value);
const reelIdValidation = [
  param('id').isMongoId().withMessage('A valid reel id is required')
];

const listReelsValidation = [
  query('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  query('region').optional().trim().notEmpty().withMessage('Region cannot be empty'),
  query('city').optional().trim().notEmpty().withMessage('City cannot be empty'),
  query('state').optional().trim().notEmpty().withMessage('State cannot be empty'),
  query('seller').optional().isMongoId().withMessage('seller must be a valid id'),
  query('store').optional().isMongoId().withMessage('store must be a valid id')
];

const taggedProductsValidation = body('taggedProductIds')
  .optional()
  .isArray()
  .withMessage('Tagged products must be an array');

const createReelValidation = [
  body('videoUrl')
    .custom(isValidUrl)
    .withMessage('Video URL must be valid'),
  body('thumbnailUrl')
    .custom(isValidUrl)
    .withMessage('Thumbnail URL must be valid'),
  body('caption').optional().trim(),
  body('hashtags').optional().isArray().withMessage('Hashtags must be an array'),
  body('hashtags.*').optional().isString().withMessage('Each hashtag must be a string').trim(),
  body('region').trim().notEmpty().withMessage('Region is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('subcategory').optional({ checkFalsy: true }).trim(),
  taggedProductsValidation,
  body('taggedProductIds.*').isMongoId().withMessage('Each tagged product id must be valid'),
  body('mutedByDefault').optional().isBoolean().withMessage('mutedByDefault must be true or false').toBoolean(),
  body('status').optional().isIn(['active', 'hidden', 'sold_out']).withMessage('Invalid reel status'),
  body('storeId').optional().isMongoId().withMessage('storeId must be a valid id'),
  body('videoPublicId').optional().trim(),
  body('duration').optional().isFloat({ min: 0 }).withMessage('duration must be a positive number').toFloat(),
  body('fileSize').optional().isInt({ min: 0 }).withMessage('fileSize must be a positive integer').toInt(),
  body('mimeType').optional().trim(),
  body('processingStatus').optional().isIn(['ready', 'processing', 'failed']).withMessage('Invalid processing status')
];

const updateReelValidation = [
  param('id').isMongoId().withMessage('A valid reel id is required'),
  body('videoUrl')
    .optional()
    .custom(isValidUrl)
    .withMessage('Video URL must be valid'),
  body('thumbnailUrl')
    .optional()
    .custom(isValidUrl)
    .withMessage('Thumbnail URL must be valid'),
  body('caption').optional().trim(),
  body('hashtags').optional().isArray().withMessage('Hashtags must be an array'),
  body('hashtags.*').optional().isString().withMessage('Each hashtag must be a string').trim(),
  body('region').optional().trim().notEmpty().withMessage('Region cannot be empty'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('subcategory').optional({ checkFalsy: true }).trim(),
  body('taggedProductIds')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Reels must tag at least 1 product'),
  body('taggedProductIds.*').optional().isMongoId().withMessage('Each tagged product id must be valid'),
  body('mutedByDefault').optional().isBoolean().withMessage('mutedByDefault must be true or false').toBoolean(),
  body('status').optional().isIn(['active', 'hidden', 'sold_out']).withMessage('Invalid reel status'),
  body('storeId').optional().isMongoId().withMessage('storeId must be a valid id'),
  body('videoPublicId').optional().trim(),
  body('duration').optional().isFloat({ min: 0 }).withMessage('duration must be a positive number').toFloat(),
  body('fileSize').optional().isInt({ min: 0 }).withMessage('fileSize must be a positive integer').toInt(),
  body('mimeType').optional().trim(),
  body('processingStatus').optional().isIn(['ready', 'processing', 'failed']).withMessage('Invalid processing status')
];

module.exports = {
  reelIdValidation,
  listReelsValidation,
  createReelValidation,
  updateReelValidation
};
