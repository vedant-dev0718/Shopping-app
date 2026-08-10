const router = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const { requireBuyer, requireSeller } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const bargainController = require('./bargain.controller');
const {
  productIdValidation,
  bidIdValidation,
  acceptBidValidation,
  sellerBidActionValidation,
  closeBargainValidation,
  scheduleValidation,
  createBidOrderValidation,
  placeBidValidation
} = require('./bargain.validation');

router.get('/active', bargainController.getActiveBargains);
router.get('/my-bids', authenticate, requireBuyer, bargainController.getMyBids);
router.post('/products/:productId/schedule', authenticate, requireSeller, scheduleValidation, validate, bargainController.scheduleBargain);
router.post('/products/:productId/bid-order', authenticate, requireBuyer, createBidOrderValidation, validate, bargainController.createBidOrder);
router.post('/products/:productId/bids', authenticate, requireBuyer, placeBidValidation, validate, bargainController.placeBid);
router.get('/products/:productId/bids/summary', authenticate, requireBuyer, productIdValidation, validate, bargainController.getProductBidSummary);
router.post('/products/:productId/bids/:bidId/accept', authenticate, requireSeller, acceptBidValidation, validate, bargainController.acceptBid);
router.post('/products/:productId/bids/:bidId/close-window', authenticate, requireSeller, sellerBidActionValidation, validate, bargainController.closeBidPaymentWindow);
router.post('/products/:productId/bids/:bidId/reopen-negotiation', authenticate, requireSeller, sellerBidActionValidation, validate, bargainController.reopenBidNegotiation);
router.delete('/bids/:bidId', authenticate, requireBuyer, bidIdValidation, validate, bargainController.withdrawBid);
router.get('/products/:productId/bids', authenticate, requireSeller, productIdValidation, validate, bargainController.getProductBids);
router.post('/products/:productId/close', authenticate, requireSeller, closeBargainValidation, validate, bargainController.closeBargain);

module.exports = router;
