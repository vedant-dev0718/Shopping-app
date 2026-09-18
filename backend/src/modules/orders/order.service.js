const AppError = require('../../utils/AppError');
const Order = require('./order.model');
const postOrderService = require('./postOrder.service');

const addPostOrderComputedFields = (order) => {
  if (!order) {
    return order;
  }

  const deliveredAt = order.deliveryInfo?.deliveredAt || order.deliveredAt || null;
  const returnWindowEndsAt = order.deliveryInfo?.returnWindowEndsAt
    || (deliveredAt ? new Date(new Date(deliveredAt).getTime() + postOrderService.RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000) : null);
  const hasShipment = Boolean(order.shiprocketShipmentId || order.trackingNumber || order.shippedAt);
  const cancellableStatuses = ['pending', 'placed', 'awaiting_seller_acceptance', 'confirmed', 'processing'];
  const returnStatus = order.returnInfo?.returnStatus || 'none';

  return {
    ...order,
    deliveryInfo: {
      ...(order.deliveryInfo || {}),
      deliveredAt,
      returnWindowEndsAt
    },
    refundStatus: order.refundStatus || order.refundInfo?.refundStatus || 'none',
    trackingNumber: order.trackingNumber || '',
    trackingCarrier: order.trackingCarrier || '',
    trackingUrl: order.trackingUrl || '',
    shippingLabelUrl: order.shippingLabelUrl || '',
    shippedAt: order.shippedAt || null,
    canCancel: cancellableStatuses.includes(order.orderStatus) && !hasShipment,
    canRequestReturn: order.orderStatus === 'delivered'
      && returnStatus === 'none'
      && returnWindowEndsAt
      && Date.now() <= new Date(returnWindowEndsAt).getTime()
  };
};

const getOrders = async (buyerId) => {
  const orders = await Order.find({ buyerId })
    .populate('items.productId', 'title imageUrls category region status')
    .sort({ createdAt: -1 })
    .lean();

  return orders.map(addPostOrderComputedFields);
};

const getOrderById = async (buyerId, orderId) => {
  const order = await Order.findOne({
    _id: orderId,
    buyerId
  })
    .populate('items.productId', 'title imageUrls category region status')
    .lean();

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  return addPostOrderComputedFields(order);
};

module.exports = {
  getOrders,
  getOrderById
};
