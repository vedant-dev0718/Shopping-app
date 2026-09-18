const router = require('express').Router();

const { authenticate, optionalAuthenticate } = require('../../middleware/auth.middleware');
const { catalogueReadLimiter } = require('../../middleware/catalogueRateLimiter');
const { requireBuyer, requireSeller } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const storeController = require('./store.controller');
const {
  storeIdValidation,
  listStoresValidation,
  storeProductsValidation,
  updateSellerStoreValidation
} = require('./store.validation');

router.get('/', optionalAuthenticate, catalogueReadLimiter, listStoresValidation, validate, storeController.listStores);
router.get('/seller/me', authenticate, requireSeller, storeController.getSellerStore);
router.patch('/seller/me', authenticate, requireSeller, updateSellerStoreValidation, validate, storeController.updateSellerStore);
router.get('/:id/products', optionalAuthenticate, catalogueReadLimiter, storeProductsValidation, validate, storeController.getStoreProducts);
router.get('/:id/reels', optionalAuthenticate, catalogueReadLimiter, storeIdValidation, validate, storeController.getStoreReels);
router.post('/:id/view', optionalAuthenticate, storeIdValidation, validate, storeController.recordStoreView);
router.post('/:id/save', authenticate, requireBuyer, storeIdValidation, validate, storeController.saveStore);
router.delete('/:id/save', authenticate, requireBuyer, storeIdValidation, validate, storeController.unsaveStore);
router.get('/:id', optionalAuthenticate, storeIdValidation, validate, storeController.getStore);

module.exports = router;
