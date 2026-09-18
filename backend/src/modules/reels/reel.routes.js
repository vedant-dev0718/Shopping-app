const reelRoutes = require('express').Router();
const sellerReelRoutes = require('express').Router();

const { authenticate, optionalAuthenticate } = require('../../middleware/auth.middleware');
const { catalogueReadLimiter } = require('../../middleware/catalogueRateLimiter');
const { requireSeller } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const commentRoutes = require('../comments/comment.routes');
const likeRoutes = require('../likes/like.routes');
const reelController = require('./reel.controller');
const {
  reelIdValidation,
  listReelsValidation,
  createReelValidation,
  updateReelValidation
} = require('./reel.validation');

reelRoutes.get('/', optionalAuthenticate, catalogueReadLimiter, listReelsValidation, validate, reelController.listReels);
reelRoutes.use('/:id/comments', optionalAuthenticate, commentRoutes);
reelRoutes.use('/:id/like', likeRoutes);
reelRoutes.get('/:id/products', optionalAuthenticate, catalogueReadLimiter, reelIdValidation, validate, reelController.getTaggedProducts);
reelRoutes.post('/:id/view', optionalAuthenticate, reelIdValidation, validate, reelController.recordReelView);
reelRoutes.get('/:id', optionalAuthenticate, reelIdValidation, validate, reelController.getReel);

sellerReelRoutes.get('/', authenticate, requireSeller, reelController.listSellerReels);
sellerReelRoutes.post('/', authenticate, requireSeller, createReelValidation, validate, reelController.createSellerReel);
sellerReelRoutes.patch('/:id', authenticate, requireSeller, updateReelValidation, validate, reelController.updateSellerReel);
sellerReelRoutes.delete('/:id', authenticate, requireSeller, reelIdValidation, validate, reelController.deleteSellerReel);

module.exports = {
  reelRoutes,
  sellerReelRoutes
};
