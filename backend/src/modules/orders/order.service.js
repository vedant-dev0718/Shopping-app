const AppError = require('../../utils/AppError');
const { buildUpiQrPayload } = require('../../utils/upiQr');
const SellerProfile = require('../sellers/sellerProfile.model');
const Order = require('./order.model');
const postOrderService = require('./postOrder.service');

/**
 * Exposes the seller's UPI QR once their items are delivered.
 * Item-level so a co-seller's undelivered items cannot suppress it.
 */
const attachStorePaymentQr = async (order) => {
  const deliveredItems = (order?.items || []).filter((item) => item.itemStatus === 'delivered');

  if (deliveredItems.length === 0) {
    return order;
  }

  const sellerId = (deliveredItems[0].sellerId || '').toString();
  if (!sellerId) {
    return order;
  }

  const profile = await SellerProfile.findOne({ userId: sellerId }).select('storeName upiId').lean();
  const upiId = profile?.upiId || '';

  const sellerItems = deliveredItems.filter((item) => item.sellerId.toString() === sellerId);
  const itemsTotal = sellerItems.reduce((total, item) => total + (item.itemTotal || 0), 0);
  // Shipping is only attributable when the whole order belongs to this seller.
  const ownsWholeOrder = (order.items || []).every((item) => item.sellerId.toString() === sellerId);
  const amount = Math.round((itemsTotal + (ownsWholeOrder ? (order.shipping || 0) : 0)) * 100) / 100;
  const storeName = profile?.storeName || 'Store';
  const qrCode = buildUpiQrPayload({ upiId, storeName, amount });

  return {
    ...order,
    storePayment: {
      storeName,
      upiId,
      amount,
      currency: 'INR',
      qrCode,
      qrCodeLabel: qrCode
        ? `Scan to pay ${storeName}`
        : `${storeName} has not set up UPI payments yet`
    }
  };
};

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

  return attachStorePaymentQr(addPostOrderComputedFields(order));
};

module.exports = {
  getOrders,
  getOrderById
};
