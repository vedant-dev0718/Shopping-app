const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const service = require('./adminOperations.service');

const send = (res, message, data, meta = null) => successResponse(res, { message, data, meta });
const sendList = (res, message, result) => send(res, message, result.items, result.pagination);

const listOrders = asyncHandler(async (req, res) => sendList(res, 'Orders fetched', await service.listOrders(req.query)));
const getOrder = asyncHandler(async (req, res) => send(res, 'Order detail fetched', await service.getOrderDetail(req.params.orderId)));
const updateOrderStatus = asyncHandler(async (req, res) => send(res, 'Order status updated', await service.updateOrderStatus(req.user.id, req.params.orderId, req.body)));
const cancelOrder = asyncHandler(async (req, res) => send(res, 'Order cancelled', await service.cancelOrder(req.user.id, req.params.orderId, req.body)));
const forceAcceptOrder = asyncHandler(async (req, res) => send(res, 'Order force accepted', await service.forceAcceptOrder(req.user.id, req.params.orderId, req.body)));
const forceRefundOrder = asyncHandler(async (req, res) => send(res, 'Order refund forced', await service.forceRefundOrder(req.user.id, req.params.orderId, req.body)));
const getOrderTimeline = asyncHandler(async (req, res) => send(res, 'Order timeline fetched', await service.buildTimeline(req.params.orderId)));

const listPayments = asyncHandler(async (req, res) => sendList(res, 'Payments fetched', await service.listPayments(req.query)));
const getPayment = asyncHandler(async (req, res) => send(res, 'Payment detail fetched', await service.getPaymentByOrder(req.params.paymentId)));
const getPaymentByRazorpay = asyncHandler(async (req, res) => send(res, 'Payment detail fetched', await service.getPaymentByRazorpay(req.params.razorpayPaymentId)));

const listRefunds = asyncHandler(async (req, res) => sendList(res, 'Refunds fetched', await service.listRefunds(req.query)));
const getRefund = asyncHandler(async (req, res) => send(res, 'Refund detail fetched', await service.getRefund(req.params.refundId)));
const processRefund = asyncHandler(async (req, res) => send(res, 'Refund marked processing', await service.markRefund(req.user.id, req.params.refundId, 'processing', req.body)));
const markRefundSuccess = asyncHandler(async (req, res) => send(res, 'Refund marked successful', await service.markRefund(req.user.id, req.params.refundId, 'refunded', req.body)));
const markRefundFailed = asyncHandler(async (req, res) => send(res, 'Refund marked failed', await service.markRefund(req.user.id, req.params.refundId, 'failed', req.body)));

const listReturns = asyncHandler(async (req, res) => sendList(res, 'Returns fetched', await service.listReturns(req.query)));
const getReturn = asyncHandler(async (req, res) => send(res, 'Return detail fetched', await service.getReturn(req.params.returnId)));
const approveReturn = asyncHandler(async (req, res) => send(res, 'Return approved', await service.approveReturn(req.user.id, req.params.returnId, req.body)));
const rejectReturn = asyncHandler(async (req, res) => send(res, 'Return rejected', await service.rejectReturn(req.user.id, req.params.returnId, req.body)));
const markReturnReceived = asyncHandler(async (req, res) => send(res, 'Return marked received', await service.markReturnReceived(req.user.id, req.params.returnId, req.body)));
const refundReturn = asyncHandler(async (req, res) => send(res, 'Return refund triggered', await service.refundReturn(req.user.id, req.params.returnId, req.body)));

const listCancellations = asyncHandler(async (req, res) => sendList(res, 'Cancellations fetched', await service.listCancellations(req.query)));
const getCancellation = asyncHandler(async (req, res) => send(res, 'Cancellation detail fetched', await service.getCancellation(req.params.cancellationId)));
const approveCancellation = asyncHandler(async (req, res) => send(res, 'Cancellation approved', await service.approveCancellation(req.user.id, req.params.cancellationId, req.body)));
const rejectCancellation = asyncHandler(async (req, res) => send(res, 'Cancellation rejected', await service.rejectCancellation(req.user.id, req.params.cancellationId, req.body)));

const listShipments = asyncHandler(async (req, res) => sendList(res, 'Shipments fetched', await service.listShipments(req.query)));
const getShipment = asyncHandler(async (req, res) => send(res, 'Shipment detail fetched', await service.getShipment(req.params.shipmentId)));
const getShipmentByAwb = asyncHandler(async (req, res) => send(res, 'Shipment detail fetched', await service.getShipmentByAwb(req.params.awbCode)));
const updateShipmentStatus = asyncHandler(async (req, res) => send(res, 'Shipment status updated', await service.updateShipmentStatus(req.user.id, req.params.shipmentId, req.body)));
const refreshTracking = asyncHandler(async (req, res) => send(res, 'Shipment tracking refreshed', await service.refreshTracking(req.user.id, req.params.shipmentId)));

module.exports = {
  listOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  forceAcceptOrder,
  forceRefundOrder,
  getOrderTimeline,
  listPayments,
  getPayment,
  getPaymentByRazorpay,
  listRefunds,
  getRefund,
  processRefund,
  markRefundSuccess,
  markRefundFailed,
  listReturns,
  getReturn,
  approveReturn,
  rejectReturn,
  markReturnReceived,
  refundReturn,
  listCancellations,
  getCancellation,
  approveCancellation,
  rejectCancellation,
  listShipments,
  getShipment,
  getShipmentByAwb,
  updateShipmentStatus,
  refreshTracking
};
