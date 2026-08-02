const productRoutes = require('express').Router();
const sellerProductRoutes = require('express').Router();

const { authenticate, optionalAuthenticate } = require('../../middleware/auth.middleware');
const { catalogueReadLimiter } = require('../../middleware/catalogueRateLimiter');
const { requireBuyer, requireSeller } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const productController = require('./product.controller');
const {
  productIdValidation,
  listProductsValidation,
  createProductValidation,
  updateProductValidation
} = require('./product.validation');

productRoutes.get('/', optionalAuthenticate, catalogueReadLimiter, listProductsValidation, validate, productController.listProducts);
productRoutes.get('/:id/related', optionalAuthenticate, catalogueReadLimiter, productIdValidation, validate, productController.getRelatedProducts);
productRoutes.post('/:id/save', authenticate, requireBuyer, productIdValidation, validate, productController.saveProduct);
productRoutes.delete('/:id/save', authenticate, requireBuyer, productIdValidation, validate, productController.unsaveProduct);
productRoutes.post('/:id/click', optionalAuthenticate, productIdValidation, validate, productController.recordProductClick);
productRoutes.get('/:id', optionalAuthenticate, productIdValidation, validate, productController.getProduct);

sellerProductRoutes.get('/', authenticate, requireSeller, productController.listSellerProducts);
sellerProductRoutes.post('/', authenticate, requireSeller, createProductValidation, validate, productController.createSellerProduct);
sellerProductRoutes.patch('/:id', authenticate, requireSeller, updateProductValidation, validate, productController.updateSellerProduct);
sellerProductRoutes.delete('/:id', authenticate, requireSeller, productIdValidation, validate, productController.deleteSellerProduct);

module.exports = {
  productRoutes,
  sellerProductRoutes
};
