const { body, param } = require('express-validator');

const addCartItemValidation = [
  body('productId').isMongoId().withMessage('A valid product id is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1').toInt(),
  body('bargainBidId').optional().isMongoId().withMessage('bargainBidId must be a valid id')
];

const updateCartItemValidation = [
  param('itemId').isMongoId().withMessage('A valid cart item id is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1').toInt()
];

const cartItemIdValidation = [
  param('itemId').isMongoId().withMessage('A valid cart item id is required')
];

module.exports = {
  addCartItemValidation,
  updateCartItemValidation,
  cartItemIdValidation
};
