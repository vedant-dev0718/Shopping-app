const { body, param, query } = require('express-validator');

const storeIdValidation = [
  param('id').isMongoId().withMessage('A valid store id is required')
];

const listStoresValidation = [
  query('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  query('region').optional().trim().notEmpty().withMessage('Region cannot be empty'),
  query('city').optional().trim().notEmpty().withMessage('City cannot be empty'),
  query('state').optional().trim().notEmpty().withMessage('State cannot be empty'),
  query('seller').optional().isMongoId().withMessage('seller must be a valid id')
];

const storeProductsValidation = [
  param('id').isMongoId().withMessage('A valid store id is required'),
  query('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  query('region').optional().trim().notEmpty().withMessage('Region cannot be empty'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be zero or greater').toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be zero or greater').toFloat(),
  query('status').optional().isIn(['active', 'sold_out']).withMessage('Invalid public product status')
];

const updateSellerStoreValidation = [
  body('storeName').optional().trim().notEmpty().withMessage('Store name cannot be empty'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('locality').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Locality must be 120 characters or fewer'),
  body('city').optional().trim().notEmpty().withMessage('City cannot be empty'),
  body('state').optional().trim().notEmpty().withMessage('State cannot be empty'),
  body('pincode').optional({ checkFalsy: true }).trim().matches(/^\d{6}$/).withMessage('Pincode must be a 6-digit number'),
  body('country').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Country must be 80 characters or fewer'),
  body('region').optional().trim().notEmpty().withMessage('Region cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('story').optional().trim(),
  body('profileImageUrl').optional().trim(),
  body('bannerImageUrl').optional().trim(),
  body('featuredCategories').optional().isArray({ max: 12 }).withMessage('Featured categories must be a list'),
  body('featuredCategories.*').optional().trim().notEmpty().withMessage('Featured category cannot be empty')
];

module.exports = {
  storeIdValidation,
  listStoresValidation,
  storeProductsValidation,
  updateSellerStoreValidation
};
