const router = require('express').Router();
const { body, param, query } = require('express-validator');

const controller = require('./adminOperations.controller');
const validate = require('../../middleware/validate.middleware');

const mongoId = (name) => param(name).isMongoId().withMessage(`${name} must be a valid id`);
const paging = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('fromDate').optional().isISO8601(),
  query('toDate').optional().isISO8601()
];
const reason = body('reason').optional({ checkFalsy: true }).trim().isLength({ max: 1000 });

router.get('/orders', [
  ...paging,
  query('sellerId').optional().isMongoId(),
  query('buyerId').optional().isMongoId(),
  query('storeId').optional().isMongoId(),
  query('minAmount').optional().isFloat({ min: 0 }),
  query('maxAmount').optional().isFloat({ min: 0 })
], validate, controller.listOrders);
router.get('/orders/:orderId', [mongoId('orderId')], validate, controller.getOrder);
router.patch('/orders/:orderId/status', [mongoId('orderId'), body('orderStatus').notEmpty(), reason], validate, controller.updateOrderStatus);
router.patch('/orders/:orderId/cancel', [mongoId('orderId'), reason], validate, controller.cancelOrder);
router.patch('/orders/:orderId/force-accept', [mongoId('orderId'), reason], validate, controller.forceAcceptOrder);
router.patch('/orders/:orderId/force-refund', [mongoId('orderId'), body('amount').optional().isFloat({ min: 0.01 }), reason], validate, controller.forceRefundOrder);
router.get('/orders/:orderId/timeline', [mongoId('orderId')], validate, controller.getOrderTimeline);

router.get('/payments', paging, validate, controller.listPayments);
router.get('/payments/razorpay/:razorpayPaymentId', [param('razorpayPaymentId').trim().notEmpty()], validate, controller.getPaymentByRazorpay);
router.get('/payments/:paymentId', [mongoId('paymentId')], validate, controller.getPayment);

router.get('/refunds', paging, validate, controller.listRefunds);
router.get('/refunds/:refundId', [mongoId('refundId')], validate, controller.getRefund);
router.patch('/refunds/:refundId/process', [mongoId('refundId'), reason], validate, controller.processRefund);
router.patch('/refunds/:refundId/mark-success', [mongoId('refundId'), reason], validate, controller.markRefundSuccess);
router.patch('/refunds/:refundId/mark-failed', [
  mongoId('refundId'),
  body('failureReason').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  reason
], validate, controller.markRefundFailed);

router.get('/returns', paging, validate, controller.listReturns);
router.get('/returns/:returnId', [mongoId('returnId')], validate, controller.getReturn);
router.patch('/returns/:returnId/approve', [mongoId('returnId'), reason], validate, controller.approveReturn);
router.patch('/returns/:returnId/reject', [
  mongoId('returnId'),
  body('rejectionReason').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  reason
], validate, controller.rejectReturn);
router.patch('/returns/:returnId/mark-received', [mongoId('returnId'), reason], validate, controller.markReturnReceived);
router.patch('/returns/:returnId/refund', [mongoId('returnId'), body('amount').optional().isFloat({ min: 0.01 }), reason], validate, controller.refundReturn);

router.get('/cancellations', paging, validate, controller.listCancellations);
router.get('/cancellations/:cancellationId', [mongoId('cancellationId')], validate, controller.getCancellation);
router.patch('/cancellations/:cancellationId/approve', [mongoId('cancellationId'), reason], validate, controller.approveCancellation);
router.patch('/cancellations/:cancellationId/reject', [
  mongoId('cancellationId'),
  body('rejectionReason').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  reason
], validate, controller.rejectCancellation);

router.get('/shipments', paging, validate, controller.listShipments);
router.get('/shipments/awb/:awbCode', [param('awbCode').trim().notEmpty()], validate, controller.getShipmentByAwb);
router.get('/shipments/:shipmentId', [param('shipmentId').trim().notEmpty()], validate, controller.getShipment);
router.patch('/shipments/:shipmentId/status', [
  param('shipmentId').trim().notEmpty(),
  body('status').trim().notEmpty().isLength({ max: 160 }),
  body('trackingNumber').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
  body('courier').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
  body('trackingUrl').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  reason
], validate, controller.updateShipmentStatus);
router.post('/shipments/:shipmentId/refresh-tracking', [param('shipmentId').trim().notEmpty()], validate, controller.refreshTracking);

module.exports = router;
