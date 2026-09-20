const AppError = require('../../utils/AppError');
const postOrderService = require('../orders/postOrder.service');
const Order = require('../orders/order.model');
const ReturnRequest = require('./return.model');

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const getOrderItem = (order, itemId) => {
  return order.items.find((item) => item._id && item._id.toString() === itemId.toString());
};

const requestReturn = async (buyerId, { orderId, itemId, reason, description = '' }) => {
  const order = await Order.findOne({
    _id: orderId,
    buyerId
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.orderStatus !== 'delivered') {
    throw new AppError('Only delivered orders can be returned', 400);
  }

  if (!order.deliveredAt || Date.now() - order.deliveredAt.getTime() > RETURN_WINDOW_MS) {
    throw new AppError('Return window has expired', 400);
  }

  const item = getOrderItem(order, itemId);

  if (!item) {
    throw new AppError('Order item not found', 404);
  }

  const existingReturn = await ReturnRequest.findOne({
    orderId,
    itemId
  });

  if (existingReturn) {
    throw new AppError('Return already requested for this item', 409);
  }

  return ReturnRequest.create({
    orderId,
    buyerId,
    sellerId: item.sellerId,
    itemId,
    reason,
    description,
    refundAmount: item.itemTotal ?? ((item.quantity || 0) * (item.priceSnapshot || 0))
  });
};

const getReturnsByBuyer = async (buyerId) => {
  return ReturnRequest.find({ buyerId })
    .populate('orderId', 'orderNumber orderStatus deliveredAt')
    .populate('sellerId', 'name email')
    .sort({ requestedAt: -1 })
    .lean();
};

const resolveReturn = async (sellerId, returnId, { approved }) => {
  const returnRequest = await ReturnRequest.findOne({
    _id: returnId,
    sellerId
  });

  if (!returnRequest) {
    throw new AppError('Return request not found', 404);
  }

  if (returnRequest.status !== 'requested') {
    throw new AppError('Return request has already been resolved', 400);
  }

  returnRequest.status = approved ? 'approved' : 'rejected';
  returnRequest.resolvedAt = new Date();

  if (!approved) {
    returnRequest.refundStatus = 'failed';
  }

  await returnRequest.save();
  return returnRequest;
};

const processRefund = async (returnId) => {
  const returnRequest = await ReturnRequest.findById(returnId);

  if (!returnRequest) {
    throw new AppError('Return request not found', 404);
  }

  if (returnRequest.status !== 'approved') {
    throw new AppError('Only approved returns can be refunded', 400);
  }

  const order = await Order.findById(returnRequest.orderId);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  await postOrderService.processRefundForOrder(order._id, {
    amount: returnRequest.refundAmount,
    reason: returnRequest.reason,
    returnId: returnRequest._id
  });
  returnRequest.refundStatus = 'pending';
  await returnRequest.save();
  return returnRequest;
};

module.exports = {
  requestReturn,
  getReturnsByBuyer,
  resolveReturn,
  processRefund
};
