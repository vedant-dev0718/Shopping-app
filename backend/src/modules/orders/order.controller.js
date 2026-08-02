const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const orderService = require('./order.service');
const postOrderService = require('./postOrder.service');

const getOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getOrders(req.user.id);

  return successResponse(res, {
    message: 'Orders fetched successfully',
    data: orders
  });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.user.id, req.params.id);

  return successResponse(res, {
    message: 'Order fetched successfully',
    data: order
  });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await postOrderService.requestOrderCancellation(
    req.user.id,
    req.params.orderId,
    req.body.reason
  );

  return successResponse(res, {
    message: 'Cancellation submitted successfully',
    data: order
  });
});

const requestReturn = asyncHandler(async (req, res) => {
  const returnRequest = await postOrderService.requestOrderReturn(
    req.user.id,
    req.params.orderId,
    req.body
  );

  return successResponse(res, {
    statusCode: 201,
    message: 'Return requested successfully',
    data: returnRequest
  });
});

const getRefundStatus = asyncHandler(async (req, res) => {
  const status = await postOrderService.getRefundStatus(req.user.id, req.params.orderId);

  return successResponse(res, {
    message: 'Refund status fetched successfully',
    data: status
  });
});

const getReturnStatus = asyncHandler(async (req, res) => {
  const status = await postOrderService.getReturnStatus(req.user.id, req.params.orderId);

  return successResponse(res, {
    message: 'Return status fetched successfully',
    data: status
  });
});

const processRefund = asyncHandler(async (req, res) => {
  const refund = await postOrderService.processRefundForOrder(req.params.orderId, {
    amount: req.body.amount,
    reason: req.body.reason || 'Manual refund',
    requestedBy: req.user.role
  });

  return successResponse(res, {
    message: 'Refund processing started successfully',
    data: refund
  });
});

module.exports = {
  getOrders,
  getOrder,
  cancelOrder,
  requestReturn,
  getRefundStatus,
  getReturnStatus,
  processRefund
};
