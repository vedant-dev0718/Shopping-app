const router = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const { requireBuyer } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const checkoutController = require('./checkout.controller');
const { placeCodValidation, placeQrPaymentValidation } = require('./checkout.validation');

router.use(authenticate, requireBuyer);

router.post('/start', checkoutController.startCheckout);
router.post('/place-cod', placeCodValidation, validate, checkoutController.placeCodOrder);
router.post('/place-qr-payment', placeQrPaymentValidation, validate, checkoutController.placeQrPaymentOrder);

module.exports = router;
