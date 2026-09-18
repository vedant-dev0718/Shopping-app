const router = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const { requireSeller } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const sellerOrderController = require('./sellerOrder.controller');
const {
  orderIdValidation,
  listSellerOrdersValidation,
  updateStatusValidation,
  shipOrderValidation,
  cancelOrderValidation,
  createShipmentValidation,
  rejectionValidation,
  acceptOrderValidation,
  rejectOrderValidation
} = require('./sellerOrder.validation');

router.use(authenticate, requireSeller);

router.get('/', listSellerOrdersValidation, validate, sellerOrderController.getSellerOrders);
router.get('/new', sellerOrderController.getNewSellerOrders);
router.get('/pending-acceptance', sellerOrderController.getPendingAcceptanceOrders);
router.get('/:orderId', orderIdValidation, validate, sellerOrderController.getSellerOrder);
router.post('/:orderId/accept', acceptOrderValidation, validate, sellerOrderController.acceptSellerOrder);
router.post('/:orderId/reject', rejectOrderValidation, validate, sellerOrderController.rejectSellerOrder);
router.patch('/:orderId/status', updateStatusValidation, validate, sellerOrderController.updateSellerOrderStatus);
router.patch('/:orderId/ship', shipOrderValidation, validate, sellerOrderController.shipSellerOrder);
router.post('/:orderId/delivered', orderIdValidation, validate, sellerOrderController.markOrderDelivered);
router.patch('/:orderId/cancel', cancelOrderValidation, validate, sellerOrderController.cancelSellerOrder);
router.patch('/:orderId/cancel/approve', orderIdValidation, validate, sellerOrderController.approveCancellation);
router.patch('/:orderId/cancel/reject', orderIdValidation, rejectionValidation, validate, sellerOrderController.rejectCancellation);
router.post('/:orderId/create-shipment', createShipmentValidation, validate, sellerOrderController.createShipment);

module.exports = router;
