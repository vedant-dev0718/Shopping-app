const router = require('express').Router();
const { body, param } = require('express-validator');

const { authenticate } = require('../../middleware/auth.middleware');
const { authorizeRoles, requireBuyer } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const orderController = require('./order.controller');

router.use(authenticate);

router.get('/', requireBuyer, orderController.getOrders);
router.post(
  '/:orderId/cancel',
  requireBuyer,
  [
    param('orderId').isMongoId().withMessage('A valid order id is required'),
    body('reason')
      .trim()
      .notEmpty()
      .withMessage('Cancellation reason is required')
      .isLength({ max: 500 })
      .withMessage('Cancellation reason must be 500 characters or fewer')
  ],
  validate,
  orderController.cancelOrder
);
router.post(
  '/:orderId/returns',
  requireBuyer,
  [
    param('orderId').isMongoId().withMessage('A valid order id is required'),
    body('reason')
      .trim()
      .notEmpty()
      .withMessage('Return reason is required')
      .isLength({ max: 120 })
      .withMessage('Return reason must be 120 characters or fewer'),
    body('description')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be 500 characters or fewer'),
    body('imageUrls')
      .optional()
      .isArray({ max: 5 })
      .withMessage('imageUrls must be an array with up to 5 images'),
    body('imageUrls.*')
      .optional({ checkFalsy: true })
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Each image URL must be valid')
  ],
  validate,
  orderController.requestReturn
);
router.get(
  '/:orderId/refund-status',
  requireBuyer,
  [param('orderId').isMongoId().withMessage('A valid order id is required')],
  validate,
  orderController.getRefundStatus
);
router.get(
  '/:orderId/return-status',
  requireBuyer,
  [param('orderId').isMongoId().withMessage('A valid order id is required')],
  validate,
  orderController.getReturnStatus
);
router.get(
  '/:id',
  requireBuyer,
  [param('id').isMongoId().withMessage('A valid order id is required')],
  validate,
  orderController.getOrder
);

router.post(
  '/:orderId/refund',
  authorizeRoles('admin'),
  [
    param('orderId').isMongoId().withMessage('A valid order id is required'),
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Refund amount must be greater than zero'),
    body('reason').optional({ checkFalsy: true }).trim().isLength({ max: 250 })
  ],
  validate,
  orderController.processRefund
);

module.exports = router;
