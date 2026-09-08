const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const postOrderService = require('../orders/postOrder.service');
const sellerOrderService = require('./sellerOrder.service');

const getSellerOrders = asyncHandler(async (req, res) => {
  const orders = await sellerOrderService.getSellerOrders(req.user.id, req.query);

  return successResponse(res, {
    message: 'Seller orders fetched successfully',
    data: orders
  });
});

const getNewSellerOrders = asyncHandler(async (req, res) => {
  const orders = await sellerOrderService.getNewSellerOrders(req.user.id);

  return successResponse(res, {
    message: 'New seller orders fetched successfully',
    data: orders
  });
});

const getPendingAcceptanceOrders = asyncHandler(async (req, res) => {
  const orders = await sellerOrderService.getPendingAcceptanceOrders(req.user.id);

  return successResponse(res, {
    message: 'Pending seller acceptance orders fetched successfully',
    data: orders
  });
});

const getSellerOrder = asyncHandler(async (req, res) => {
  const order = await sellerOrderService.getSellerOrderById(req.user.id, req.params.orderId);

  return successResponse(res, {
    message: 'Seller order fetched successfully',
    data: order
  });
});

const updateSellerOrderStatus = asyncHandler(async (req, res) => {
  const order = await sellerOrderService.updateSellerOrderStatus(
    req.user.id,
    req.params.orderId,
    req.body.orderStatus
  );

  return successResponse(res, {
    message: 'Seller order status updated successfully',
    data: order
  });
});

const acceptSellerOrder = asyncHandler(async (req, res) => {
  const order = await sellerOrderService.acceptSellerOrder(
    req.user.id,
    req.params.orderId,
    req.body.message || ''
  );

  return successResponse(res, {
    message: 'Order accepted successfully',
    data: order
  });
});

const confirmOrderPayment = asyncHandler(async (req, res) => {
  const order = await sellerOrderService.confirmSellerOrderPayment(req.user.id, req.params.orderId);

  return successResponse(res, {
    message: 'Buyer payment confirmed successfully',
    data: order
  });
});

const rejectSellerOrder = asyncHandler(async (req, res) => {
  const order = await sellerOrderService.rejectSellerOrder(
    req.user.id,
    req.params.orderId,
    {
      reason: req.body.reason,
      messageToBuyer: req.body.messageToBuyer
    }
  );

  return successResponse(res, {
    message: 'Order rejected successfully',
    data: order
  });
});

const shipSellerOrder = asyncHandler(async (req, res) => {
  const order = await sellerOrderService.markSellerOrderShipped(
    req.user.id,
    req.params.orderId,
    req.body
  );

  return successResponse(res, {
    message: 'Seller order marked as shipped successfully',
    data: order
  });
});

const cancelSellerOrder = asyncHandler(async (req, res) => {
  const order = await sellerOrderService.cancelSellerOrder(
    req.user.id,
    req.params.orderId,
    req.body.cancelReason
  );

  return successResponse(res, {
    message: 'Seller order cancelled successfully',
    data: order
  });
});

const markOrderDelivered = asyncHandler(async (req, res) => {
  const order = await sellerOrderService.markOrderDelivered(
    req.user.id,
    req.params.orderId
  );

  return successResponse(res, {
    message: 'Seller order marked as delivered successfully',
    data: order
  });
});

const createShipment = asyncHandler(async (req, res) => {
  const result = await sellerOrderService.createShipmentForOrder(
    req.user.id,
    req.params.orderId,
    {
      pickupAddressId: req.body.pickupAddressId,
      weight: parseFloat(req.body.weight),
      length: parseFloat(req.body.length),
      breadth: parseFloat(req.body.breadth),
      height: parseFloat(req.body.height)
    }
  );

  return successResponse(res, {
    message: 'Shipment created successfully',
    data: result
  });
});

const approveCancellation = asyncHandler(async (req, res) => {
  const order = await postOrderService.approveCancellation(req.user.id, req.params.orderId, 'seller');

  return successResponse(res, {
    message: 'Cancellation approved successfully',
    data: order
  });
});

const rejectCancellation = asyncHandler(async (req, res) => {
  const order = await postOrderService.rejectCancellation(
    req.user.id,
    req.params.orderId,
    req.body.rejectionReason,
    'seller'
  );

  return successResponse(res, {
    message: 'Cancellation rejected successfully',
    data: order
  });
});

const getReturns = asyncHandler(async (req, res) => {
  const returns = await postOrderService.listReturnsForSeller(req.user.id);

  return successResponse(res, {
    message: 'Seller returns fetched successfully',
    data: returns
  });
});

const getReturn = asyncHandler(async (req, res) => {
  const returnRequest = await postOrderService.getReturnForSeller(req.user.id, req.params.returnId);

  return successResponse(res, {
    message: 'Seller return fetched successfully',
    data: returnRequest
  });
});

const approveReturn = asyncHandler(async (req, res) => {
  const returnRequest = await postOrderService.reviewReturn(req.user.id, req.params.returnId, { approved: true }, 'seller');

  return successResponse(res, {
    message: 'Return approved successfully',
    data: returnRequest
  });
});

const rejectReturn = asyncHandler(async (req, res) => {
  const returnRequest = await postOrderService.reviewReturn(
    req.user.id,
    req.params.returnId,
    {
      approved: false,
      rejectionReason: req.body.rejectionReason
    },
    'seller'
  );

  return successResponse(res, {
    message: 'Return rejected successfully',
    data: returnRequest
  });
});

const markReturnReceived = asyncHandler(async (req, res) => {
  const returnRequest = await postOrderService.markReturnReceived(req.user.id, req.params.returnId);

  return successResponse(res, {
    message: 'Return marked received successfully',
    data: returnRequest
  });
});

module.exports = {
  getSellerOrders,
  getNewSellerOrders,
  getPendingAcceptanceOrders,
  getSellerOrder,
  updateSellerOrderStatus,
  acceptSellerOrder,
  confirmOrderPayment,
  rejectSellerOrder,
  shipSellerOrder,
  cancelSellerOrder,
  markOrderDelivered,
  createShipment,
  approveCancellation,
  rejectCancellation,
  getReturns,
  getReturn,
  approveReturn,
  rejectReturn,
  markReturnReceived
};
