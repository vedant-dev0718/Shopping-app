const { body, param, query } = require('express-validator');

const ORDER_STATUSES = [
  'placed',
  'payment_authorization_pending',
  'awaiting_seller_acceptance',
  'seller_accepted',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'return_requested',
  'return_approved',
  'return_rejected',
  'returned',
  'seller_rejected',
  'cancelled_unavailable',
  'acceptance_expired',
  'refunded'
];
const PAYMENT_STATUSES = [
  'created',
  'pending',
  'pending_authorization',
  'authorized',
  'capture_pending',
  'captured',
  'paid',
  'failed',
  'authorization_released',
  'authorization_expired',
  'auto_refund_pending',
  'refunded',
  'refund_pending',
  'partially_refunded',
  'capture_failed'
];
const SELLER_STATUS_UPDATES = ['confirmed', 'processing'];

const orderIdValidation = [
  param('orderId').isMongoId().withMessage('A valid order id is required')
];

const listSellerOrdersValidation = [
  query('status')
    .optional()
    .isIn(ORDER_STATUSES)
    .withMessage('Invalid order status'),
  query('paymentStatus')
    .optional()
    .isIn(PAYMENT_STATUSES)
    .withMessage('Invalid payment status'),
  query('fromDate')
    .optional()
    .isISO8601()
    .withMessage('fromDate must be a valid ISO date')
    .toDate(),
  query('toDate')
    .optional()
    .isISO8601()
    .withMessage('toDate must be a valid ISO date')
    .toDate()
];

const updateStatusValidation = [
  ...orderIdValidation,
  body('orderStatus')
    .isIn(SELLER_STATUS_UPDATES)
    .withMessage('Seller status updates must be confirmed or processing')
];

const shipOrderValidation = [
  ...orderIdValidation,
  body('trackingNumber')
    .trim()
    .notEmpty()
    .withMessage('Tracking number is required'),
  body('trackingCarrier')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 })
    .withMessage('Tracking carrier must be 120 characters or fewer'),
  body('trackingUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Tracking URL must be 500 characters or fewer')
];

const cancelOrderValidation = [
  ...orderIdValidation,
  body('cancelReason')
    .trim()
    .notEmpty()
    .withMessage('Cancel reason is required')
    .isLength({ max: 500 })
    .withMessage('Cancel reason must be 500 characters or fewer')
];

const createShipmentValidation = [
  ...orderIdValidation,
  body('pickupAddressId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('A valid pickup address id is required'),
  body('weight')
    .isFloat({ min: 0.1, max: 50 })
    .withMessage('Weight must be between 0.1 and 50 kg'),
  body('length')
    .isFloat({ min: 1, max: 200 })
    .withMessage('Length must be between 1 and 200 cm'),
  body('breadth')
    .isFloat({ min: 1, max: 200 })
    .withMessage('Breadth must be between 1 and 200 cm'),
  body('height')
    .isFloat({ min: 1, max: 200 })
    .withMessage('Height must be between 1 and 200 cm')
];

const returnIdValidation = [
  param('returnId').isMongoId().withMessage('A valid return id is required')
];

const rejectionValidation = [
  body('rejectionReason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ max: 500 })
    .withMessage('Rejection reason must be 500 characters or fewer')
];

const acceptOrderValidation = [
  ...orderIdValidation,
  body('message')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Acceptance message must be 500 characters or fewer')
];

const rejectOrderValidation = [
  ...orderIdValidation,
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ max: 250 })
    .withMessage('Rejection reason must be 250 characters or fewer'),
  body('messageToBuyer')
    .trim()
    .notEmpty()
    .withMessage('Buyer message is required')
    .isLength({ max: 500 })
    .withMessage('Buyer message must be 500 characters or fewer')
];

module.exports = {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SELLER_STATUS_UPDATES,
  orderIdValidation,
  listSellerOrdersValidation,
  updateStatusValidation,
  shipOrderValidation,
  cancelOrderValidation,
  createShipmentValidation,
  returnIdValidation,
  rejectionValidation,
  acceptOrderValidation,
  rejectOrderValidation
};
