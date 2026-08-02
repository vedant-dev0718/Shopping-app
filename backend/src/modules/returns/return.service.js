const AppError = require('../../utils/AppError');
const { razorpay } = require('../../utils/razorpay');
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

  if (!order || !order.razorpayPaymentId) {
    throw new AppError('Razorpay payment not found for this order', 400);
  }

  try {
    await razorpay.payments.refund(order.razorpayPaymentId, {
      amount: Math.round(returnRequest.refundAmount * 100),
      speed: 'normal',
      notes: {
        returnId: returnRequest._id.toString(),
        orderId: order._id.toString()
      }
    });

    returnRequest.refundStatus = 'initiated';
    await returnRequest.save();
    return returnRequest;
  } catch (error) {
    returnRequest.refundStatus = 'failed';
    await returnRequest.save();
    throw error;
  }
};

module.exports = {
  requestReturn,
  getReturnsByBuyer,
  resolveReturn,
  processRefund
};
