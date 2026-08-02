const router = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const { requireBuyer, requireSeller } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const bargainController = require('./bargain.controller');
const {
  productIdValidation,
  bidIdValidation,
  scheduleValidation,
  createBidOrderValidation,
  placeBidValidation
} = require('./bargain.validation');

router.get('/active', bargainController.getActiveBargains);
router.post('/products/:productId/schedule', authenticate, requireSeller, scheduleValidation, validate, bargainController.scheduleBargain);
router.post('/products/:productId/bid-order', authenticate, requireBuyer, createBidOrderValidation, validate, bargainController.createBidOrder);
router.post('/products/:productId/bids', authenticate, requireBuyer, placeBidValidation, validate, bargainController.placeBid);
router.delete('/bids/:bidId', authenticate, requireBuyer, bidIdValidation, validate, bargainController.withdrawBid);
router.get('/products/:productId/bids', authenticate, requireSeller, productIdValidation, validate, bargainController.getProductBids);
router.post('/products/:productId/close', authenticate, requireSeller, productIdValidation, validate, bargainController.closeBargain);

module.exports = router;
