const router = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const { requireBuyer } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const checkoutController = require('./checkout.controller');
const { verifyCheckoutValidation, placeCodValidation } = require('./checkout.validation');

// Public — loaded by iOS WKWebView, no auth token available in HTML context
router.get('/razorpay-web', checkoutController.razorpayWebCheckout);

router.use(authenticate, requireBuyer);

router.post('/start', checkoutController.startCheckout);
router.post('/verify', verifyCheckoutValidation, validate, checkoutController.verifyAndPlaceOrder);
router.post('/place-cod', placeCodValidation, validate, checkoutController.placeCodOrder);

module.exports = router;
