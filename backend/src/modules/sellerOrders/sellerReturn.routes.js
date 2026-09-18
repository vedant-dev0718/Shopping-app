const router = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const { requireSeller } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const sellerOrderController = require('./sellerOrder.controller');
const {
  returnIdValidation,
  rejectionValidation
} = require('./sellerOrder.validation');

router.use(authenticate, requireSeller);

router.get('/', sellerOrderController.getReturns);
router.get('/:returnId', returnIdValidation, validate, sellerOrderController.getReturn);
router.patch('/:returnId/approve', returnIdValidation, validate, sellerOrderController.approveReturn);
router.patch('/:returnId/reject', returnIdValidation, rejectionValidation, validate, sellerOrderController.rejectReturn);
router.patch('/:returnId/mark-received', returnIdValidation, validate, sellerOrderController.markReturnReceived);

module.exports = router;
