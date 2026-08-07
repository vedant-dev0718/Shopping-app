const { body, param, query } = require('express-validator');

// Accepts any http/https URL including localhost (for dev S3 proxy URLs)
const isValidUrl = (value) => /^https?:\/\/.+/.test(value);
const productIdValidation = [
  param('id').isMongoId().withMessage('A valid product id is required')
];

const listProductsValidation = [
  query('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  query('region').optional().trim().notEmpty().withMessage('Region cannot be empty'),
  query('city').optional().trim().notEmpty().withMessage('City cannot be empty'),
  query('state').optional().trim().notEmpty().withMessage('State cannot be empty'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be zero or greater').toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be zero or greater').toFloat(),
  query('seller').optional().isMongoId().withMessage('seller must be a valid id'),
  query('store').optional().isMongoId().withMessage('store must be a valid id'),
  query('status').optional().isIn(['active', 'sold_out']).withMessage('Invalid public product status')
];

const createProductValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('productLink')
    .optional({ checkFalsy: true })
    .custom(isValidUrl)
    .withMessage('Product link must be a valid URL'),
  body('subcategory').optional({ checkFalsy: true }).trim(),
  body('region').trim().notEmpty().withMessage('Region is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be zero or greater').toFloat(),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be zero or greater').toInt(),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isString().withMessage('Each tag must be a string').trim(),
  body('imageUrls').optional().isArray().withMessage('Image URLs must be an array'),
  body('imageUrls.*')
    .if((value) => value && value.trim())
    .custom(isValidUrl)
    .withMessage('Each image URL must be valid'),
  body('featured').optional().isBoolean().withMessage('Featured must be true or false').toBoolean(),
  body('status').optional().isIn(['active', 'sold_out', 'inactive']).withMessage('Invalid product status'),
  body('storeId').optional().isMongoId().withMessage('storeId must be a valid id')
];

const updateProductValidation = [
  param('id').isMongoId().withMessage('A valid product id is required'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('productLink')
    .optional({ checkFalsy: true })
    .custom(isValidUrl)
    .withMessage('Product link must be a valid URL'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('subcategory').optional({ checkFalsy: true }).trim(),
  body('region').optional().trim().notEmpty().withMessage('Region cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be zero or greater').toFloat(),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be zero or greater').toInt(),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isString().withMessage('Each tag must be a string').trim(),
  body('imageUrls').optional().isArray().withMessage('Image URLs must be an array'),
  body('imageUrls.*')
    .if((value) => value && value.trim())
    .custom(isValidUrl)
    .withMessage('Each image URL must be valid'),
  body('featured').optional().isBoolean().withMessage('Featured must be true or false').toBoolean(),
  body('status').optional().isIn(['active', 'sold_out', 'inactive']).withMessage('Invalid product status'),
  body('storeId').optional().isMongoId().withMessage('storeId must be a valid id')
];

module.exports = {
  productIdValidation,
  listProductsValidation,
  createProductValidation,
  updateProductValidation
};
