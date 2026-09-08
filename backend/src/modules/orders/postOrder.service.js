const AppError = require('../../utils/AppError');
const analyticsService = require('../analytics/analytics.service');
const CancellationRequest = require('../cancellations/cancellationRequest.model');
const financeService = require('../finance/finance.service');
const notificationService = require('../notifications/notification.service');
const Product = require('../products/product.model');
const Refund = require('../refunds/refund.model');
const ReturnRequest = require('../returns/return.model');
const Order = require('./order.model');
const { createRefund } = require('../../utils/razorpay');

const RETURN_WINDOW_DAYS = 7;
const RETURN_WINDOW_MS = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const PRE_SHIPMENT_STATUSES = ['pending', 'placed', 'awaiting_seller_acceptance', 'confirmed', 'processing'];
const FINAL_REFUND_STATUSES = ['refunded', 'partially_refunded', 'refund_processing'];

const asString = (value) => (value ? value.toString() : '');

const getReturnItemIds = (returnRequest) => (returnRequest.items || []).length > 0
  ? returnRequest.items.map((item) => item.itemId)
  : [returnRequest.itemId].filter(Boolean);

const getDeliveredAt = (order) => order.deliveryInfo?.deliveredAt || order.deliveredAt || null;

const getReturnWindowEndsAt = (order) => {
  const deliveredAt = getDeliveredAt(order);
  return deliveredAt ? new Date(deliveredAt.getTime() + RETURN_WINDOW_MS) : null;
};

const hydrateOrderPostStatus = (order) => {
  if (!order.cancelInfo) {
    order.cancelInfo = {};
  }
  if (!order.returnInfo) {
    order.returnInfo = {};
  }
  if (!order.refundInfo) {
    order.refundInfo = {};
  }
  if (!order.deliveryInfo) {
    order.deliveryInfo = {};
  }

  if (order.deliveredAt && !order.deliveryInfo.deliveredAt) {
    order.deliveryInfo.deliveredAt = order.deliveredAt;
  }
  if (order.deliveryInfo.deliveredAt && !order.deliveryInfo.returnWindowEndsAt) {
    order.deliveryInfo.returnWindowEndsAt = getReturnWindowEndsAt(order);
  }
  if (order.refundStatus && !order.refundInfo.refundStatus) {
    order.refundInfo.refundStatus = order.refundStatus;
  }
};

const hasShipment = (order) => Boolean(order.shiprocketShipmentId || order.trackingNumber || order.shippedAt);

const canCancelBeforeShipment = (order) => {
  const items = order.items || [];
  return PRE_SHIPMENT_STATUSES.includes(order.orderStatus)
    && !hasShipment(order)
    && items.every((item) => !['shipped', 'delivered', 'returned', 'refunded'].includes(item.itemStatus));
};

const ensureCancellationNotDuplicate = (order) => {
  hydrateOrderPostStatus(order);
  const cancellationStatus = order.cancelInfo?.cancellationStatus;

  if (
    order.orderStatus === 'cancelled'
    || ['requested', 'approved', 'cancelled'].includes(cancellationStatus)
    || (order.items || []).every((item) => item.itemStatus === 'cancelled')
  ) {
    throw new AppError('Order cancellation has already been requested or completed', 400);
  }
};

const trackOrderItems = async (order, eventType, metadata = {}) => {
  await Promise.all((order.items || []).map((item) => analyticsService.trackEventSafe({
    userId: order.buyerId,
    sellerId: item.sellerId,
    storeId: item.storeId,
    productId: item.productId,
    eventType,
    metadata: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      ...metadata
    }
  })));
};

const restoreStockForItems = async (items = [], metadata = {}) => {
  await Promise.all(items.map(async (item) => {
    const product = await Product.findByIdAndUpdate(
      item.productId,
      {
        $inc: { stock: item.quantity || 0 },
        $set: { status: 'active' }
      },
      { new: true }
    );

    await analyticsService.trackEventSafe({
      sellerId: item.sellerId,
      storeId: item.storeId,
      productId: item.productId,
      eventType: 'stock_restored',
      metadata: {
        quantity: item.quantity || 0,
        newStock: product?.stock,
        ...metadata
      }
    });
  }));
};

const getPrimarySellerId = (order) => {
  const firstItem = (order.items || [])[0];
  return firstItem?.sellerId || (order.sellerIds || [])[0] || null;
};

const notifyOrderSellers = async (order, payload) => notificationService.sendToUsers(order.sellerIds || [], payload);

const createCancellationRecord = async (order, actorRole, actorId, reason, status) => {
  const existing = await CancellationRequest.findOne({
    orderId: order._id,
    status: { $in: ['requested', 'approved', 'cancelled'] }
  });

  if (existing) {
    return existing;
  }

  return CancellationRequest.create({
    orderId: order._id,
    buyerId: order.buyerId,
    sellerId: actorRole === 'seller' ? actorId : getPrimarySellerId(order),
    requestedBy: actorRole,
    reason,
    status
  });
};

const applyCancellationToOrder = async (order, actorRole, reason) => {
  hydrateOrderPostStatus(order);

  if (order.orderStatus === 'cancelled') {
    throw new AppError('Order is already cancelled', 409);
  }

  if (!canCancelBeforeShipment(order)) {
    throw new AppError('This order cannot be cancelled automatically after shipment has started', 400);
  }

  const wasAwaitingSellerAcceptance = order.orderStatus === 'awaiting_seller_acceptance';
  const cancelledAt = new Date();

  order.items.forEach((item) => {
    if (!['cancelled', 'returned', 'refunded'].includes(item.itemStatus)) {
      item.itemStatus = 'cancelled';
      item.itemCancelledAt = cancelledAt;
      item.itemCancelReason = reason;
    }
  });

  order.orderStatus = 'cancelled';
  order.trackingStatus = 'Cancelled';
  order.cancelledAt = cancelledAt;
  order.cancelReason = reason;
  order.cancelInfo.cancelledBy = actorRole;
  order.cancelInfo.cancelReason = reason;
  order.cancelInfo.cancelledAt = cancelledAt;
  order.cancelInfo.cancellationStatus = 'cancelled';

  if (order.paymentStatus === 'paid') {
    order.refundStatus = 'refund_pending';
    order.refundInfo.refundStatus = 'refund_pending';
    order.refundInfo.refundReason = reason;
  }

  const stockRestoreItems = wasAwaitingSellerAcceptance
    ? order.items.filter((item) => item.itemAcceptanceStatus === 'accepted')
    : order.items.filter((item) => item.itemAcceptanceStatus !== 'pending');

  await restoreStockForItems(stockRestoreItems, {
    orderId: order._id,
    reason: 'order_cancelled'
  });
  await financeService.updateEarningsForOrderAdjustment(order, {
    status: 'cancelled',
    refundAmount: order.paymentStatus === 'paid' ? order.finalTotal : 0
  });
  await order.save();
  await trackOrderItems(order, 'order_cancelled', { cancelledBy: actorRole, reason });

  if (actorRole === 'buyer') {
    await notifyOrderSellers(order, {
      title: 'Order cancelled',
      subtitle: `Buyer cancelled order #${order.orderNumber}`,
      data: { type: 'order_cancelled', orderId: order._id.toString() }
    });
  } else {
    await notificationService.sendToUser(order.buyerId, {
      title: 'Order cancelled',
      subtitle: `Order #${order.orderNumber} has been cancelled`,
      data: { type: 'order_cancelled', orderId: order._id.toString() }
    });
  }

  if (order.paymentStatus === 'paid') {
    try {
      await processRefundForOrder(order._id, {
        reason,
        requestedBy: actorRole,
        amount: order.finalTotal
      });
    } catch (error) {
      order.refundStatus = 'refund_failed';
      order.refundInfo.refundStatus = 'refund_failed';
      order.refundInfo.refundFailureReason = error.message;
      await order.save();
    }
  }

  return Order.findById(order._id).lean();
};

const requestOrderCancellation = async (buyerId, orderId, reason) => {
  const order = await Order.findOne({ _id: orderId, buyerId });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  ensureCancellationNotDuplicate(order);
  await createCancellationRecord(order, 'buyer', buyerId, reason, canCancelBeforeShipment(order) ? 'cancelled' : 'requested');
  await trackOrderItems(order, 'order_cancel_requested', { requestedBy: 'buyer', reason });

  if (!canCancelBeforeShipment(order)) {
    hydrateOrderPostStatus(order);
    order.cancelInfo.cancellationStatus = 'requested';
    order.cancelInfo.cancelReason = reason;
    await order.save();
    await notifyOrderSellers(order, {
      title: 'Cancellation requested',
      subtitle: `Buyer requested cancellation for order #${order.orderNumber}`,
      data: { type: 'cancellation_requested', orderId: order._id.toString() }
    });
    return order.toObject();
  }

  return applyCancellationToOrder(order, 'buyer', reason);
};

const cancelOrderBySeller = async (sellerId, orderId, reason) => {
  const order = await Order.findOne({
    _id: orderId,
    'items.sellerId': sellerId
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  ensureCancellationNotDuplicate(order);
  await createCancellationRecord(order, 'seller', sellerId, reason, canCancelBeforeShipment(order) ? 'cancelled' : 'requested');
  await trackOrderItems(order, 'order_cancel_requested', { requestedBy: 'seller', reason });

  return applyCancellationToOrder(order, 'seller', reason);
};

const approveCancellation = async (actorId, orderId, actorRole = 'seller') => {
  const query = actorRole === 'seller'
    ? { _id: orderId, 'items.sellerId': actorId }
    : { _id: orderId };
  const order = await Order.findOne(query);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const cancellation = await CancellationRequest.findOne({
    orderId,
    status: { $in: ['requested', 'cancelled'] }
  }).sort({ createdAt: -1 });

  if (cancellation) {
    cancellation.status = 'approved';
    cancellation.reviewedBy = actorId;
    await cancellation.save();
  }

  hydrateOrderPostStatus(order);
  order.cancelInfo.cancellationStatus = 'approved';

  return applyCancellationToOrder(order, actorRole, order.cancelInfo.cancelReason || cancellation?.reason || 'Cancellation approved');
};

const rejectCancellation = async (actorId, orderId, rejectionReason, actorRole = 'seller') => {
  const query = actorRole === 'seller'
    ? { _id: orderId, 'items.sellerId': actorId }
    : { _id: orderId };
  const order = await Order.findOne(query);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  hydrateOrderPostStatus(order);
  order.cancelInfo.cancellationStatus = 'rejected';
  order.cancelInfo.cancellationRejectionReason = rejectionReason;
  await order.save();

  const cancellation = await CancellationRequest.findOne({
    orderId,
    status: 'requested'
  }).sort({ createdAt: -1 });

  if (cancellation) {
    cancellation.status = 'rejected';
    cancellation.reviewedBy = actorId;
    cancellation.rejectionReason = rejectionReason;
    await cancellation.save();
  }

  await notificationService.sendToUser(order.buyerId, {
    title: 'Cancellation rejected',
    subtitle: `Order #${order.orderNumber} will continue processing`,
    data: { type: 'cancellation_rejected', orderId: order._id.toString() }
  });

  await trackOrderItems(order, 'order_cancel_rejected', { rejectedBy: actorRole, rejectionReason });
  return order.toObject();
};

const requestOrderReturn = async (buyerId, orderId, { reason, description = '', imageUrls = [] }) => {
  const order = await Order.findOne({ _id: orderId, buyerId });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  hydrateOrderPostStatus(order);

  if (order.orderStatus !== 'delivered') {
    throw new AppError('Only delivered orders can be returned', 400);
  }

  const returnWindowEndsAt = getReturnWindowEndsAt(order);

  if (!returnWindowEndsAt || Date.now() > returnWindowEndsAt.getTime()) {
    throw new AppError('Return window has expired', 400);
  }

  const existingReturn = await ReturnRequest.findOne({
    orderId,
    status: { $in: ['requested', 'approved', 'in_transit', 'received', 'completed'] }
  });

  if (existingReturn) {
    throw new AppError('Return already requested for this order', 409);
  }

  const returnItems = order.items
    .filter((item) => item.returnEligible !== false && !['cancelled', 'returned', 'refunded'].includes(item.itemStatus))
    .map((item) => ({
      itemId: item._id,
      productId: item.productId,
      titleSnapshot: item.titleSnapshot,
      quantity: item.quantity,
      refundAmount: item.itemTotal || ((item.quantity || 0) * (item.priceSnapshot || 0))
    }));

  if (returnItems.length === 0) {
    throw new AppError('No return eligible items found for this order', 400);
  }

  const refundAmount = returnItems.reduce((total, item) => total + (item.refundAmount || 0), 0);
  const returnRequest = await ReturnRequest.create({
    orderId,
    buyerId,
    sellerId: getPrimarySellerId(order),
    items: returnItems,
    reason,
    description,
    imageUrls,
    refundAmount
  });

  order.orderStatus = 'return_requested';
  order.returnInfo.returnStatus = 'requested';
  order.returnInfo.requestedBy = 'buyer';
  order.returnInfo.returnReason = reason;
  order.returnInfo.returnDescription = description;
  order.returnInfo.returnImageUrls = imageUrls;
  order.returnInfo.requestedAt = returnRequest.createdAt || new Date();
  order.items.forEach((item) => {
    if (returnItems.some((returnItem) => asString(returnItem.itemId) === asString(item._id))) {
      item.itemStatus = 'return_requested';
    }
  });
  await order.save();
  await trackOrderItems(order, 'return_requested', { reason, returnId: returnRequest._id });

  await notifyOrderSellers(order, {
    title: 'Return requested',
    subtitle: `Buyer requested a return for order #${order.orderNumber}`,
    data: { type: 'return_requested', orderId: order._id.toString() }
  });

  return returnRequest.populate('orderId', 'orderNumber orderStatus returnInfo refundStatus refundInfo');
};

const listReturnsForSeller = async (sellerId) => ReturnRequest.find({ sellerId })
  .populate('buyerId', 'name email')
  .sort({ createdAt: -1, requestedAt: -1 })
  .lean();

const getReturnForSeller = async (sellerId, returnId) => {
  const returnRequest = await ReturnRequest.findOne({ _id: returnId, sellerId })
    .populate('buyerId', 'name email')
    .lean();

  if (!returnRequest) {
    throw new AppError('Return request not found', 404);
  }

  return returnRequest;
};

const reviewReturn = async (actorId, returnId, { approved, rejectionReason = '' }, actorRole = 'seller') => {
  const query = actorRole === 'seller' ? { _id: returnId, sellerId: actorId } : { _id: returnId };
  const returnRequest = await ReturnRequest.findOne(query);

  if (!returnRequest) {
    throw new AppError('Return request not found', 404);
  }

  if (returnRequest.status !== 'requested') {
    throw new AppError('Return request has already been reviewed', 400);
  }

  const order = await Order.findById(returnRequest.orderId);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  hydrateOrderPostStatus(order);
  returnRequest.status = approved ? 'approved' : 'rejected';
  returnRequest.reviewedBy = actorId;
  returnRequest.rejectionReason = approved ? '' : rejectionReason;
  returnRequest.resolvedAt = new Date();

  order.returnInfo.returnStatus = approved ? 'approved' : 'rejected';
  order.returnInfo.reviewedBy = actorId;
  order.returnInfo.reviewedAt = returnRequest.resolvedAt;
  order.returnInfo.rejectionReason = approved ? '' : rejectionReason;
  order.orderStatus = approved ? 'return_approved' : 'return_rejected';
  order.items.forEach((item) => {
    if ((returnRequest.items || []).some((returnItem) => asString(returnItem.itemId) === asString(item._id))) {
      item.itemStatus = approved ? 'return_approved' : 'return_rejected';
    }
  });

  if (approved) {
    await financeService.updateEarningsForOrderAdjustment(order, {
      status: 'held',
      refundAmount: returnRequest.refundAmount,
      itemIds: getReturnItemIds(returnRequest)
    });
  }

  await returnRequest.save();
  await order.save();
  await trackOrderItems(order, approved ? 'return_approved' : 'return_rejected', {
    returnId,
    reviewedBy: actorRole,
    rejectionReason: approved ? undefined : rejectionReason
  });

  await notificationService.sendToUser(order.buyerId, {
    title: approved ? 'Return approved' : 'Return rejected',
    subtitle: approved
      ? `Your return for order #${order.orderNumber} was approved`
      : `Your return for order #${order.orderNumber} was rejected`,
    data: { type: approved ? 'return_approved' : 'return_rejected', orderId: order._id.toString() }
  });

  return returnRequest;
};

const markReturnReceived = async (sellerId, returnId) => {
  const returnRequest = await ReturnRequest.findOne({ _id: returnId, sellerId });

  if (!returnRequest) {
    throw new AppError('Return request not found', 404);
  }

  if (!['approved', 'in_transit'].includes(returnRequest.status)) {
    throw new AppError('Only approved or in-transit returns can be marked received', 400);
  }

  const order = await Order.findById(returnRequest.orderId);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const now = new Date();
  hydrateOrderPostStatus(order);
  returnRequest.status = 'received';
  returnRequest.returnReceivedAt = now;
  returnRequest.refundStatus = 'initiated';
  order.orderStatus = 'returned';
  order.returnInfo.returnStatus = 'received';
  order.returnInfo.returnReceivedAt = now;
  order.refundStatus = 'refund_pending';
  order.refundInfo.refundStatus = 'refund_pending';
  order.refundInfo.refundReason = returnRequest.reason;
  order.items.forEach((item) => {
    if ((returnRequest.items || []).some((returnItem) => asString(returnItem.itemId) === asString(item._id))) {
      item.itemStatus = 'returned';
    }
  });

  await restoreStockForItems(returnRequest.items.map((item) => {
    const plainItem = item.toObject ? item.toObject() : item;
    return {
      ...plainItem,
      sellerId: returnRequest.sellerId
    };
  }), {
    orderId: order._id,
    returnId: returnRequest._id,
    reason: 'return_received'
  });
  await financeService.updateEarningsForOrderAdjustment(order, {
    status: 'refunded',
    refundAmount: 0,
    itemIds: getReturnItemIds(returnRequest)
  });
  await returnRequest.save();
  await order.save();
  await trackOrderItems(order, 'return_received', { returnId });

  await processRefundForOrder(order._id, {
    reason: returnRequest.reason,
    requestedBy: 'seller',
    amount: returnRequest.refundAmount,
    returnId: returnRequest._id
  });

  return ReturnRequest.findById(returnId).lean();
};

const processRefundForOrder = async (orderId, { amount, reason = 'Refund', requestedBy = 'system', returnId = null } = {}) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  hydrateOrderPostStatus(order);

  if (!order.razorpayPaymentId) {
    throw new AppError('Razorpay payment ID not found for this order', 400);
  }

  if (FINAL_REFUND_STATUSES.includes(order.refundStatus) || FINAL_REFUND_STATUSES.includes(order.refundInfo.refundStatus)) {
    throw new AppError('Refund has already been processed for this order', 409);
  }

  const refundAmount = Math.min(Number(amount || order.finalTotal || 0), order.finalTotal || 0);

  if (refundAmount <= 0) {
    throw new AppError('Refund amount must be greater than zero', 400);
  }

  let refund = await Refund.findOne({
    orderId,
    status: { $in: ['pending', 'processing', 'refunded'] }
  });

  if (refund) {
    return refund;
  }

  refund = await Refund.create({
    orderId,
    buyerId: order.buyerId,
    sellerId: getPrimarySellerId(order),
    razorpayPaymentId: order.razorpayPaymentId,
    amount: refundAmount,
    currency: 'INR',
    reason,
    status: 'pending',
    metadata: {
      requestedBy,
      returnId
    }
  });

  order.refundStatus = 'refund_processing';
  order.refundInfo.refundId = refund._id;
  order.refundInfo.refundAmount = refundAmount;
  order.refundInfo.refundReason = reason;
  order.refundInfo.refundStatus = 'refund_processing';
  await order.save();
  await trackOrderItems(order, 'refund_requested', { refundId: refund._id, amount: refundAmount, reason });

  try {
    const razorpayRefund = await createRefund(order.razorpayPaymentId, refundAmount * 100, {
      orderId: order._id.toString(),
      refundId: refund._id.toString(),
      reason
    });

    refund.razorpayRefundId = razorpayRefund.id || '';
    refund.status = razorpayRefund.mode === 'simulated' ? 'refunded' : 'processing';
    refund.metadata = {
      ...(refund.metadata || {}),
      razorpayRefund
    };
    await refund.save();

    order.refundInfo.razorpayRefundId = refund.razorpayRefundId;
    order.refundInfo.refundMetadata = refund.metadata;
    if (refund.status === 'refunded') {
      order.refundStatus = refundAmount < order.finalTotal ? 'partially_refunded' : 'refunded';
      order.paymentStatus = refundAmount < order.finalTotal ? 'partially_refunded' : 'refunded';
      order.orderStatus = ['cancelled', 'cancelled_unavailable', 'seller_rejected'].includes(order.orderStatus)
        ? order.orderStatus
        : 'refunded';
      order.refundInfo.refundStatus = order.refundStatus;
      order.refundInfo.refundedAt = new Date();
      await trackOrderItems(order, 'refund_processed', { refundId: refund._id, amount: refundAmount });
    } else {
      order.refundStatus = 'refund_processing';
      order.refundInfo.refundStatus = 'refund_processing';
    }
    await order.save();

    return refund;
  } catch (error) {
    refund.status = 'failed';
    refund.failureReason = error.message;
    await refund.save();

    order.refundStatus = 'refund_failed';
    order.refundInfo.refundStatus = 'refund_failed';
    order.refundInfo.refundFailureReason = error.message;
    await order.save();
    await trackOrderItems(order, 'refund_failed', { refundId: refund._id, amount: refundAmount, failureReason: error.message });

    throw error;
  }
};

const getRefundStatus = async (buyerId, orderId) => {
  const order = await Order.findOne({ _id: orderId, buyerId }).lean();

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const refunds = await Refund.find({ orderId }).sort({ createdAt: -1 }).lean();
  return {
    refundStatus: order.refundStatus || order.refundInfo?.refundStatus || 'none',
    refundInfo: order.refundInfo || {},
    refunds
  };
};

const getReturnStatus = async (buyerId, orderId) => {
  const order = await Order.findOne({ _id: orderId, buyerId }).lean();

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const returns = await ReturnRequest.find({ orderId, buyerId }).sort({ createdAt: -1, requestedAt: -1 }).lean();
  return {
    returnStatus: order.returnInfo?.returnStatus || 'none',
    returnInfo: order.returnInfo || {},
    returns
  };
};

const listCancellations = async () => CancellationRequest.find()
  .populate('orderId', 'orderNumber orderStatus cancelInfo refundStatus finalTotal createdAt')
  .populate('buyerId', 'name email')
  .populate('sellerId', 'name email')
  .sort({ createdAt: -1 })
  .lean();

const listReturns = async () => ReturnRequest.find()
  .populate('orderId', 'orderNumber orderStatus returnInfo refundStatus finalTotal createdAt')
  .populate('buyerId', 'name email')
  .populate('sellerId', 'name email')
  .sort({ createdAt: -1, requestedAt: -1 })
  .lean();

const listRefunds = async () => Refund.find()
  .populate('orderId', 'orderNumber orderStatus refundStatus finalTotal createdAt')
  .populate('buyerId', 'name email')
  .populate('sellerId', 'name email')
  .sort({ createdAt: -1 })
  .lean();

const markRefund = async (refundId, status, failureReason = '') => {
  const refund = await Refund.findById(refundId);

  if (!refund) {
    throw new AppError('Refund not found', 404);
  }

  refund.status = status;
  refund.failureReason = status === 'failed' ? failureReason : '';
  await refund.save();

  const order = await Order.findById(refund.orderId);

  if (order) {
    hydrateOrderPostStatus(order);
    if (status === 'refunded') {
      order.refundStatus = refund.amount < order.finalTotal ? 'partially_refunded' : 'refunded';
      order.paymentStatus = refund.amount < order.finalTotal ? 'partially_refunded' : 'refunded';
      order.refundInfo.refundStatus = order.refundStatus;
      order.refundInfo.razorpayRefundId = refund.razorpayRefundId;
      order.refundInfo.refundedAt = new Date();
      await trackOrderItems(order, 'refund_processed', { refundId: refund._id, amount: refund.amount });
    } else if (status === 'failed') {
      order.refundStatus = 'refund_failed';
      order.refundInfo.refundStatus = 'refund_failed';
      order.refundInfo.refundFailureReason = failureReason;
      await trackOrderItems(order, 'refund_failed', { refundId: refund._id, failureReason });
    } else {
      order.refundStatus = 'refund_processing';
      order.refundInfo.refundStatus = 'refund_processing';
    }
    await order.save();
  }

  return refund;
};

module.exports = {
  RETURN_WINDOW_DAYS,
  hydrateOrderPostStatus,
  requestOrderCancellation,
  cancelOrderBySeller,
  approveCancellation,
  rejectCancellation,
  requestOrderReturn,
  listReturnsForSeller,
  getReturnForSeller,
  reviewReturn,
  markReturnReceived,
  processRefundForOrder,
  getRefundStatus,
  getReturnStatus,
  listCancellations,
  listReturns,
  listRefunds,
  markRefund
};
