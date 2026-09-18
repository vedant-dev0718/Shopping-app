const router = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const { requireBuyer } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const cartController = require('./cart.controller');
const {
  addCartItemValidation,
  updateCartItemValidation,
  cartItemIdValidation
} = require('./cart.validation');

router.use(authenticate, requireBuyer);

router.get('/', cartController.getCart);
router.post('/items', addCartItemValidation, validate, cartController.addItem);
router.patch('/items/:itemId', updateCartItemValidation, validate, cartController.updateItem);
router.delete('/items/:itemId', cartItemIdValidation, validate, cartController.deleteItem);

module.exports = router;
