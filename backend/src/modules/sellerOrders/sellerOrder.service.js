const AppError = require('../../utils/AppError');
const env = require('../../config/env');
const { releaseAuthorization, safeCapturePaymentOnce } = require('../../utils/razorpay');
const Order = require('../orders/order.model');
const postOrderService = require('../orders/postOrder.service');
const analyticsService = require('../analytics/analytics.service');
const financeService = require('../finance/finance.service');
const Product = require('../products/product.model');
const SellerProfile = require('../sellers/sellerProfile.model');
const Store = require('../stores/store.model');
const User = require('../users/user.model');
const shiprocket = require('../../utils/shiprocket');
const addressService = require('../addresses/address.service');
const { splitPaymentToSellers } = require('../checkout/webhook.controller');

const sellerOrderBaseQuery = (sellerId) => ({
  'items.sellerId': sellerId
});

const buildSellerOrderQuery = (sellerId, filters = {}) => {
  const query = sellerOrderBaseQuery(sellerId);

  if (filters.status) {
    query.orderStatus = filters.status;
  }

  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }

  if (filters.fromDate || filters.toDate) {
    query.createdAt = {};

    if (filters.fromDate) {
      query.createdAt.$gte = filters.fromDate;
    }

    if (filters.toDate) {
      query.createdAt.$lte = filters.toDate;
    }
  }

  return query;
};

const normalizeOrderItem = (item) => ({
  ...item,
  itemTotal: item.itemTotal ?? 0,
  itemAcceptanceStatus: item.itemAcceptanceStatus || 'pending',
  unavailableReason: item.unavailableReason || ''
});

const filterSellerItems = (items = [], sellerId) => {
  const sellerIdString = sellerId.toString();

  return items
    .filter((item) => item.sellerId && item.sellerId.toString() === sellerIdString)
    .map(normalizeOrderItem);
};

const toSellerOrderView = (order, sellerId) => {
  const items = filterSellerItems(order.items, sellerId);
  const sellerSubtotal = items.reduce((total, item) => total + (item.itemTotal || 0), 0);
  const orderSubtotalFromItems = (order.items || [])
    .map(normalizeOrderItem)
    .reduce((total, item) => total + (item.itemTotal || 0), 0);
  const isSingleSellerOrder = items.length === (order.items || []).length;
  const sellerShipping = isSingleSellerOrder
    ? (order.shipping || 0)
    : Math.round(((order.shipping || 0) * (sellerSubtotal / Math.max(orderSubtotalFromItems, 1))) * 100) / 100;

  return {
    _id: order._id,
    orderNumber: order.orderNumber,
    buyerId: order.buyerId,
    items,
    shippingInfo: order.shippingInfo,
    shippingAddressSnapshot: order.shippingAddressSnapshot || {},
    pickupAddressSnapshot: order.pickupAddressSnapshot || {},
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    payoutStatus: order.payoutStatus || 'pending',
    trackingNumber: order.trackingNumber || '',
    trackingCarrier: order.trackingCarrier || '',
    trackingUrl: order.trackingUrl || '',
    trackingStatus: order.trackingStatus || '',
    shippingLabelUrl: order.shippingLabelUrl || '',
    shiprocketOrderId: order.shiprocketOrderId || null,
    shiprocketShipmentId: order.shiprocketShipmentId || null,
    shippedAt: order.shippedAt || null,
    deliveredAt: order.deliveredAt || order.deliveryInfo?.deliveredAt || null,
    cancelledAt: order.cancelledAt || null,
    cancelReason: order.cancelReason || '',
    refundStatus: order.refundStatus || order.refundInfo?.refundStatus || 'none',
    cancelInfo: order.cancelInfo || {},
    returnInfo: order.returnInfo || {},
    refundInfo: order.refundInfo || {},
    deliveryInfo: order.deliveryInfo || {},
    sellerAcceptance: order.sellerAcceptance || {},
    inventoryConfirmation: order.inventoryConfirmation || {},
    sellerSubtotal,
    subtotal: sellerSubtotal,
    shipping: sellerShipping,
    finalTotal: sellerSubtotal + sellerShipping,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt || order.createdAt
  };
};

const computeOrderStatus = (items = []) => {
  if (items.length > 0 && items.every((item) => item.itemStatus === 'cancelled')) {
    return 'cancelled';
  }

  if (
    items.some((item) => item.itemStatus === 'delivered')
    && items.every((item) => ['delivered', 'cancelled'].includes(item.itemStatus))
  ) {
    return items.every((item) => item.itemStatus === 'delivered') ? 'delivered' : 'partially_delivered';
  }

  if (items.some((item) => item.itemStatus === 'shipped')) {
    return 'shipped';
  }

  return 'processing';
};

const forEachSellerItem = (order, sellerId, callback) => {
  const sellerIdString = sellerId.toString();

  order.items.forEach((item) => {
    if (item.sellerId && item.sellerId.toString() === sellerIdString) {
      callback(item);
    }
  });
};

const getSellerItems = (order, sellerId) => {
  const sellerIdString = sellerId.toString();

  return order.items.filter((item) => item.sellerId && item.sellerId.toString() === sellerIdString);
};

const hasShiprocketShipment = (order, items = []) => Boolean(
  order.shiprocketShipmentId
  || order.shiprocketOrderId
  || items.some((item) => item.shiprocketShipmentId || item.shiprocketOrderId)
);

const ensureSellerAcceptanceContainers = (order) => {
  order.sellerAcceptance = order.sellerAcceptance || {};
  order.paymentFlow = order.paymentFlow || {};
  order.inventoryConfirmation = order.inventoryConfirmation || {};
};

const isFinalOrderStatus = (status) => [
  'cancelled',
  'cancelled_unavailable',
  'seller_rejected',
  'acceptance_expired',
  'shipped',
  'delivered',
  'refunded',
  'returned'
].includes(status);

const getPendingAcceptanceQuery = (sellerId) => ({
  ...sellerOrderBaseQuery(sellerId),
  orderStatus: 'awaiting_seller_acceptance',
  'items.itemAcceptanceStatus': 'pending'
});

const trackSellerItems = async (order, sellerId, eventType, metadata = {}) => {
  const sellerItems = getSellerItems(order, sellerId);

  await Promise.all(sellerItems.map((item) => analyticsService.trackEventSafe({
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

const deductSellerItemStock = async (sellerItems) => {
  const deducted = [];

  for (const item of sellerItems) {
    const product = await Product.findById(item.productId);

    if (!product || product.status !== 'active' || product.stock < item.quantity) {
      for (const deductedItem of deducted) {
        await Product.updateOne(
          { _id: deductedItem.productId },
          {
            $inc: { stock: deductedItem.quantity },
            $set: { status: 'active' }
          }
        );
      }

      throw new AppError(`${item.titleSnapshot || 'Product'} is no longer available in the requested quantity`, 400);
    }

    const nextStock = Math.max(product.stock - item.quantity, 0);
    const update = {
      $inc: { stock: -item.quantity }
    };

    if (nextStock === 0) {
      update.$set = { status: 'sold_out' };
    }

    const result = await Product.updateOne(
      {
        _id: item.productId,
        status: 'active',
        stock: { $gte: item.quantity }
      },
      update
    );

    if (result.modifiedCount !== 1) {
      for (const deductedItem of deducted) {
        await Product.updateOne(
          { _id: deductedItem.productId },
          {
            $inc: { stock: deductedItem.quantity },
            $set: { status: 'active' }
          }
        );
      }

      throw new AppError(`${item.titleSnapshot || 'Product'} is no longer available in the requested quantity`, 400);
    }

    deducted.push(item);
  }
};

const markRejectedProductsUnavailable = async (sellerItems, reason) => {
  await Promise.all(sellerItems.map(async (item) => {
    await Product.findByIdAndUpdate(item.productId, {
      $set: {
        stock: 0,
        status: 'sold_out'
      }
    });

    await analyticsService.trackEventSafe({
      userId: null,
      sellerId: item.sellerId,
      storeId: item.storeId,
      productId: item.productId,
      eventType: 'stock_unavailable_after_order',
      metadata: {
        reason,
        orderItemId: item._id
      }
    });
  }));
};

const restoreAcceptedStockForCancelledItems = async (items = []) => {
  await Promise.all(items
    .filter((item) => item.itemAcceptanceStatus === 'accepted')
    .map((item) => Product.updateOne(
      { _id: item.productId },
      {
        $inc: { stock: item.quantity || 0 },
        $set: { status: 'active' }
      }
    )));
};

const adjustStockForLegacyDeliveredItems = async (sellerItems = []) => {
  for (const item of sellerItems) {
    if (item.itemAcceptanceStatus === 'accepted') {
      continue;
    }

    const quantity = Math.max(item.quantity || 0, 0);

    if (!item.productId || quantity === 0) {
      continue;
    }

    const product = await Product.findById(item.productId);

    if (!product) {
      continue;
    }

    const previousStock = Math.max(product.stock || 0, 0);
    const newStock = Math.max(previousStock - quantity, 0);

    const statusUpdate = newStock === 0 && product.status === 'active'
      ? 'sold_out'
      : product.status;

    await Product.updateOne(
      { _id: item.productId },
      {
        $set: {
          stock: newStock,
          status: statusUpdate
        },
        $push: {
          inventoryHistory: {
            adjustedBy: item.sellerId || null,
            previousStock,
            newStock,
            reason: 'order_delivered_legacy_sync'
          }
        }
      }
    );

    item.itemAcceptanceStatus = 'accepted';
  }
};

const maybeFinalizeAcceptedOrder = async (order) => {
  ensureSellerAcceptanceContainers(order);

  const allAccepted = (order.items || []).every((item) => item.itemAcceptanceStatus === 'accepted');

  if (!allAccepted) {
    return;
  }

  const now = new Date();
  order.sellerAcceptance.status = 'accepted';
  order.sellerAcceptance.acceptedAt = order.sellerAcceptance.acceptedAt || now;
  order.inventoryConfirmation.confirmedAvailable = true;
  order.inventoryConfirmation.confirmedAt = order.inventoryConfirmation.confirmedAt || now;
  order.inventoryReservation = order.inventoryReservation || {};
  order.inventoryReservation.status = 'confirmed';
  order.orderStatus = order.paymentStatus === 'paid' ? 'processing' : 'confirmed';
  order.trackingStatus = 'Order confirmed by seller';

  let capture;

  if (env.razorpayManualCaptureEnabled && ['authorized', 'capture_pending', 'capture_failed'].includes(order.paymentStatus)) {
    const captureResult = await safeCapturePaymentOnce(order);

    if (!captureResult.captured) {
      throw new AppError(captureResult.reason || 'Payment capture failed', 409);
    }

    capture = captureResult.payment;
    order.orderStatus = 'processing';
  } else if (order.paymentStatus === 'paid') {
    order.orderStatus = 'processing';
  }

  await financeService.createEarningsForOrder(order);

  if (order.paymentStatus === 'paid' && order.razorpayPaymentId) {
    try {
      await splitPaymentToSellers(order, order.razorpayPaymentId, capture);
    } catch (error) {
      console.error(`Failed to initiate Route transfer for accepted order ${order._id}:`, error.message);
      order.payoutStatus = 'route_transfer_failed';
    }
  }
};

const normalizeTrackingUrl = (value = '') => {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch (_error) {
    return '';
  }
};

const updateComputedOrderStatus = (order) => {
  order.orderStatus = computeOrderStatus(order.items);
  order.trackingStatus = order.orderStatus === 'cancelled' ? 'Cancelled' : order.trackingStatus;
};

const getSellerOrders = async (sellerId, filters = {}) => {
  const orders = await Order.find(buildSellerOrderQuery(sellerId, filters))
    .populate('items.productId', 'title imageUrls category region status')
    .populate('items.storeId', 'storeName city state region category')
    .sort({ createdAt: -1 })
    .lean();

  return orders.map((order) => toSellerOrderView(order, sellerId));
};

const getNewSellerOrders = async (sellerId) => {
  const orders = await Order.find({
    ...sellerOrderBaseQuery(sellerId),
    orderStatus: { $in: ['placed', 'confirmed'] }
  })
    .populate('items.productId', 'title imageUrls category region status')
    .populate('items.storeId', 'storeName city state region category')
    .sort({ createdAt: -1 })
    .lean();

  return orders.map((order) => toSellerOrderView(order, sellerId));
};

const getPendingAcceptanceOrders = async (sellerId) => {
  const orders = await Order.find(getPendingAcceptanceQuery(sellerId))
    .populate('items.productId', 'title imageUrls category region status stock')
    .populate('items.storeId', 'storeName city state region category')
    .sort({ createdAt: -1 })
    .lean();

  return orders.map((order) => toSellerOrderView(order, sellerId));
};

const listPendingAcceptanceForAdmin = async () => Order.find({
  orderStatus: 'awaiting_seller_acceptance',
  'sellerAcceptance.status': 'pending'
})
  .populate('items.productId', 'title imageUrls category region status stock')
  .populate('items.storeId', 'storeName city state region category')
  .populate('buyerId', 'name email')
  .sort({ createdAt: -1 })
  .lean();

const getSellerOrderById = async (sellerId, orderId) => {
  const order = await Order.findOne({
    _id: orderId,
    ...sellerOrderBaseQuery(sellerId)
  })
    .populate('items.productId', 'title imageUrls category region status')
    .populate('items.storeId', 'storeName city state region category')
    .lean();

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  return toSellerOrderView(order, sellerId);
};

const findSellerOrderForUpdate = async (sellerId, orderId) => {
  const order = await Order.findOne({
    _id: orderId,
    ...sellerOrderBaseQuery(sellerId)
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  return order;
};

const updateSellerOrderStatus = async (sellerId, orderId, orderStatus) => {
  const order = await findSellerOrderForUpdate(sellerId, orderId);
  const sellerItems = getSellerItems(order, sellerId);

  if (order.orderStatus === 'awaiting_seller_acceptance' || sellerItems.some((item) => item.itemAcceptanceStatus === 'pending')) {
    throw new AppError('Accept this order before moving it into fulfillment', 400);
  }

  if (sellerItems.every((item) => ['cancelled', 'delivered'].includes(item.itemStatus))) {
    throw new AppError('This order can no longer be updated', 400);
  }

  if (sellerItems.some((item) => item.itemStatus === 'shipped')) {
    throw new AppError('Shipped orders cannot be moved back to seller processing states', 400);
  }

  forEachSellerItem(order, sellerId, (item) => {
    if (!['cancelled', 'delivered'].includes(item.itemStatus)) {
      item.itemStatus = orderStatus;
    }
  });
  updateComputedOrderStatus(order);
  await order.save();

  return getSellerOrderById(sellerId, order._id);
};

const markSellerOrderShipped = async (sellerId, orderId, data) => {
  const order = await findSellerOrderForUpdate(sellerId, orderId);
  const sellerItems = getSellerItems(order, sellerId);

  if (order.orderStatus === 'awaiting_seller_acceptance' || sellerItems.some((item) => item.itemAcceptanceStatus === 'pending')) {
    throw new AppError('Accept this order before marking it shipped', 400);
  }

  if (sellerItems.some((item) => ['cancelled', 'delivered'].includes(item.itemStatus))) {
    throw new AppError('Cancelled or delivered orders cannot be marked as shipped', 400);
  }

  forEachSellerItem(order, sellerId, (item) => {
    item.itemStatus = 'shipped';
    item.itemShippedAt = new Date();
    item.itemTrackingNumber = data.trackingNumber;
  });
  updateComputedOrderStatus(order);
  order.trackingNumber = data.trackingNumber;
  order.trackingCarrier = data.trackingCarrier || data.courier || '';
  order.trackingUrl = normalizeTrackingUrl(data.trackingUrl || '');
  order.shippedAt = new Date();
  order.trackingStatus = 'Shipped';

  await order.save();

  return getSellerOrderById(sellerId, order._id);
};

const cancelSellerOrder = async (sellerId, orderId, cancelReason) => {
  await postOrderService.cancelOrderBySeller(sellerId, orderId, cancelReason);
  return getSellerOrderById(sellerId, orderId);
};

const acceptSellerOrder = async (sellerId, orderId, message = '') => {
  const order = await findSellerOrderForUpdate(sellerId, orderId);
  ensureSellerAcceptanceContainers(order);

  if (isFinalOrderStatus(order.orderStatus)) {
    throw new AppError('This order can no longer be accepted', 400);
  }

  const sellerItems = getSellerItems(order, sellerId);

  if (sellerItems.length === 0) {
    throw new AppError('No items found for this seller in the order', 404);
  }

  if (sellerItems.every((item) => item.itemAcceptanceStatus === 'accepted')) {
    return getSellerOrderById(sellerId, order._id);
  }

  if (sellerItems.some((item) => item.itemAcceptanceStatus === 'rejected') || order.sellerAcceptance.status === 'rejected') {
    throw new AppError('Rejected orders cannot be accepted', 400);
  }

  if (!['awaiting_seller_acceptance', 'placed', 'confirmed'].includes(order.orderStatus)) {
    throw new AppError('This order is not awaiting seller acceptance', 400);
  }

  const acceptedAt = new Date();

  await deductSellerItemStock(sellerItems);

  try {
    forEachSellerItem(order, sellerId, (item) => {
      item.itemAcceptanceStatus = 'accepted';
      item.itemStatus = 'processing';
    });

    order.sellerAcceptance.acceptedBy = sellerId;
    order.sellerAcceptance.acceptedAt = acceptedAt;
    order.sellerAcceptance.status = (order.items || []).every((item) => item.itemAcceptanceStatus === 'accepted')
      ? 'accepted'
      : 'pending';

    await maybeFinalizeAcceptedOrder(order);
    await order.save();
  } catch (error) {
    await restoreAcceptedStockForCancelledItems(sellerItems);
    throw error;
  }

  await trackSellerItems(order, sellerId, 'order_seller_accepted', {
    message,
    sellerAcceptanceTimeMs: acceptedAt.getTime() - new Date(order.createdAt).getTime()
  });

  return getSellerOrderById(sellerId, order._id);
};

const rejectSellerOrder = async (sellerId, orderId, { reason, messageToBuyer }) => {
  const cleanReason = (reason || '').trim();
  const cleanMessage = (messageToBuyer || '').trim();

  if (!cleanReason || !cleanMessage) {
    throw new AppError('Rejection reason and buyer message are required', 400);
  }

  const order = await findSellerOrderForUpdate(sellerId, orderId);
  ensureSellerAcceptanceContainers(order);

  if (['shipped', 'delivered'].includes(order.orderStatus)) {
    throw new AppError('Shipped or delivered orders cannot be rejected', 400);
  }

  const sellerItems = getSellerItems(order, sellerId);

  if (sellerItems.length === 0) {
    throw new AppError('No items found for this seller in the order', 404);
  }

  if (sellerItems.every((item) => item.itemAcceptanceStatus === 'rejected') || order.sellerAcceptance.status === 'rejected') {
    return getSellerOrderById(sellerId, order._id);
  }

  if (sellerItems.some((item) => item.itemAcceptanceStatus === 'accepted')) {
    throw new AppError('Accepted items cannot be rejected', 400);
  }

  const rejectedAt = new Date();
  const acceptedItemsToRestore = (order.items || []).filter((item) => (
    item.itemAcceptanceStatus === 'accepted'
    && (!item.sellerId || item.sellerId.toString() !== sellerId.toString())
  ));

  forEachSellerItem(order, sellerId, (item) => {
    item.itemAcceptanceStatus = 'rejected';
    item.itemStatus = 'cancelled';
    item.itemCancelledAt = rejectedAt;
    item.itemCancelReason = cleanReason;
    item.unavailableReason = cleanReason;
  });

  order.items.forEach((item) => {
    if (item.sellerId && item.sellerId.toString() === sellerId.toString()) {
      return;
    }

    if (!['shipped', 'delivered', 'returned', 'refunded'].includes(item.itemStatus)) {
      item.itemStatus = 'cancelled';
      item.itemCancelledAt = rejectedAt;
      item.itemCancelReason = 'Cancelled because another seller rejected the order';
    }
  });

  order.sellerAcceptance.status = 'rejected';
  order.sellerAcceptance.rejectedBy = sellerId;
  order.sellerAcceptance.rejectedAt = rejectedAt;
  order.sellerAcceptance.rejectionReason = cleanReason;
  order.sellerAcceptance.rejectionMessageToBuyer = cleanMessage;
  order.inventoryConfirmation.confirmedAvailable = false;
  order.inventoryConfirmation.unavailableReason = cleanReason;
  order.inventoryReservation = order.inventoryReservation || {};
  order.inventoryReservation.status = 'released';
  order.orderStatus = 'cancelled_unavailable';
  order.trackingStatus = 'Cancelled by seller';
  order.cancelledAt = rejectedAt;
  order.cancelReason = cleanReason;
  order.cancelInfo = order.cancelInfo || {};
  order.cancelInfo.cancelledBy = 'seller';
  order.cancelInfo.cancelReason = cleanReason;
  order.cancelInfo.cancelledAt = rejectedAt;
  order.cancelInfo.cancellationStatus = 'cancelled';

  await restoreAcceptedStockForCancelledItems(acceptedItemsToRestore);
  await markRejectedProductsUnavailable(sellerItems, cleanReason);
  await financeService.updateEarningsForOrderAdjustment(order, {
    status: 'cancelled',
    refundAmount: ['paid', 'authorized'].includes(order.paymentStatus) ? order.finalTotal : 0
  });
  await order.save();
  await trackSellerItems(order, sellerId, 'order_seller_rejected', {
    reason: cleanReason,
    messageToBuyer: cleanMessage
  });

  if (order.paymentStatus === 'authorized') {
    try {
      await releaseAuthorization(order.razorpayPaymentId, {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        reason: cleanReason || 'seller_rejected'
      });
      order.paymentStatus = 'authorization_released';
      order.paymentFlow = order.paymentFlow || {};
      order.paymentFlow.refundedAt = new Date();
      order.refundStatus = 'none';
      order.refundInfo = order.refundInfo || {};
      order.refundInfo.refundStatus = 'none';
      order.refundInfo.refundReason = cleanReason;
      await order.save();
    } catch (error) {
      order.paymentStatus = 'auto_refund_pending';
      order.refundStatus = 'refund_pending';
      order.refundInfo = order.refundInfo || {};
      order.refundInfo.refundStatus = 'refund_pending';
      order.refundInfo.refundFailureReason = error.message;
      await order.save();
    }
  } else if (order.paymentStatus === 'paid') {
    order.paymentStatus = 'refund_pending';
    order.refundStatus = 'refund_pending';
    order.refundInfo = order.refundInfo || {};
    order.refundInfo.refundStatus = 'refund_pending';
    order.refundInfo.refundReason = cleanReason;
    await order.save();
    await trackSellerItems(order, sellerId, 'refund_triggered_due_to_unavailable', { reason: cleanReason });

    try {
      const refund = await postOrderService.processRefundForOrder(order._id, {
        amount: order.finalTotal,
        reason: cleanReason,
        requestedBy: 'seller'
      });

      if (refund?.razorpayRefundId) {
        const refreshed = await Order.findById(order._id);
        if (refreshed) {
          refreshed.paymentFlow = refreshed.paymentFlow || {};
          refreshed.paymentFlow.razorpayRefundId = refund.razorpayRefundId;
          refreshed.paymentFlow.refundedAt = refund.status === 'refunded' ? new Date() : refreshed.paymentFlow.refundedAt;
          await refreshed.save();
        }
      }
    } catch (error) {
      console.error(`Failed to create seller rejection refund for order ${order._id}:`, error.message);
    }
  }

  return getSellerOrderById(sellerId, order._id);
};

const forceAcceptOrder = async (adminId, orderId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  ensureSellerAcceptanceContainers(order);

  if (isFinalOrderStatus(order.orderStatus)) {
    throw new AppError('This order can no longer be accepted', 400);
  }

  const pendingItems = (order.items || []).filter((item) => item.itemAcceptanceStatus !== 'accepted');

  if (pendingItems.length === 0) {
    return Order.findById(orderId).lean();
  }

  await deductSellerItemStock(pendingItems);

  const acceptedAt = new Date();
  order.items.forEach((item) => {
    item.itemAcceptanceStatus = 'accepted';
    item.itemStatus = 'processing';
  });
  order.sellerAcceptance.status = 'accepted';
  order.sellerAcceptance.acceptedBy = adminId;
  order.sellerAcceptance.acceptedAt = acceptedAt;

  await maybeFinalizeAcceptedOrder(order);
  await order.save();

  await Promise.all((order.items || []).map((item) => analyticsService.trackEventSafe({
    userId: order.buyerId,
    sellerId: item.sellerId,
    storeId: item.storeId,
    productId: item.productId,
    eventType: 'order_seller_accepted',
    metadata: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      forcedBy: 'admin'
    }
  })));

  return Order.findById(orderId).lean();
};

const forceCancelOrder = async (adminId, orderId, reason = 'Order cancelled by admin') => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  ensureSellerAcceptanceContainers(order);

  if (['shipped', 'delivered'].includes(order.orderStatus)) {
    throw new AppError('Shipped or delivered orders cannot be force-cancelled', 400);
  }

  if (['cancelled_unavailable', 'seller_rejected', 'cancelled', 'refunded'].includes(order.orderStatus)) {
    return Order.findById(orderId).lean();
  }

  const cancelledAt = new Date();
  const acceptedItemsToRestore = (order.items || []).filter((item) => item.itemAcceptanceStatus === 'accepted');

  order.items.forEach((item) => {
    if (!['shipped', 'delivered', 'returned', 'refunded'].includes(item.itemStatus)) {
      item.itemStatus = 'cancelled';
      item.itemAcceptanceStatus = item.itemAcceptanceStatus === 'accepted' ? 'accepted' : 'rejected';
      item.itemCancelledAt = cancelledAt;
      item.itemCancelReason = reason;
    }
  });

  order.sellerAcceptance.status = 'expired';
  order.sellerAcceptance.rejectedBy = adminId;
  order.sellerAcceptance.rejectedAt = cancelledAt;
  order.sellerAcceptance.rejectionReason = reason;
  order.sellerAcceptance.rejectionMessageToBuyer = reason;
  order.orderStatus = 'cancelled_unavailable';
  if (reason === 'Seller acceptance window expired') {
    order.orderStatus = 'acceptance_expired';
  }
  order.trackingStatus = 'Cancelled';
  order.cancelledAt = cancelledAt;
  order.cancelReason = reason;
  order.cancelInfo = order.cancelInfo || {};
  order.cancelInfo.cancelledBy = 'admin';
  order.cancelInfo.cancelReason = reason;
  order.cancelInfo.cancelledAt = cancelledAt;
  order.cancelInfo.cancellationStatus = 'cancelled';
  order.inventoryReservation = order.inventoryReservation || {};
  order.inventoryReservation.status = 'expired';

  await restoreAcceptedStockForCancelledItems(acceptedItemsToRestore);
  await financeService.updateEarningsForOrderAdjustment(order, {
    status: 'cancelled',
    refundAmount: ['paid', 'authorized'].includes(order.paymentStatus) ? order.finalTotal : 0
  });
  await order.save();

  await Promise.all((order.items || []).map((item) => analyticsService.trackEventSafe({
    userId: order.buyerId,
    sellerId: item.sellerId,
    storeId: item.storeId,
    productId: item.productId,
    eventType: 'order_acceptance_expired',
    metadata: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      reason
    }
  })));

  if (order.paymentStatus === 'authorized') {
    try {
      await releaseAuthorization(order.razorpayPaymentId, {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        reason: reason || 'admin_cancelled'
      });
      order.paymentStatus = 'authorization_released';
      order.refundStatus = 'none';
      order.refundInfo = order.refundInfo || {};
      order.refundInfo.refundStatus = 'none';
      order.refundInfo.refundReason = reason;
      order.paymentFlow = order.paymentFlow || {};
      order.paymentFlow.refundedAt = new Date();
      await order.save();
    } catch (error) {
      order.paymentStatus = 'auto_refund_pending';
      order.refundStatus = 'refund_pending';
      order.refundInfo = order.refundInfo || {};
      order.refundInfo.refundStatus = 'refund_pending';
      order.refundInfo.refundReason = reason;
      order.refundInfo.refundFailureReason = error.message;
      await order.save();
    }
  } else if (order.paymentStatus === 'paid') {
    try {
      await postOrderService.processRefundForOrder(order._id, {
        amount: order.finalTotal,
        reason,
        requestedBy: 'admin'
      });
    } catch (error) {
      console.error(`Failed to create admin cancellation refund for order ${order._id}:`, error.message);
    }
  }

  return Order.findById(orderId).lean();
};

const processExpiredAcceptanceOrders = async () => {
  const expiredOrders = await Order.find({
    orderStatus: 'awaiting_seller_acceptance',
    'sellerAcceptance.status': 'pending',
    'sellerAcceptance.expiresAt': { $lte: new Date() }
  }).select('_id');
  const results = [];

  for (const order of expiredOrders) {
    try {
      results.push(await forceCancelOrder(null, order._id, 'Seller acceptance window expired'));
    } catch (error) {
      results.push({
        _id: order._id,
        error: error.message
      });
    }
  }

  return results;
};

const markOrderDelivered = async (sellerId, orderId, options = {}) => {
  const order = await findSellerOrderForUpdate(sellerId, orderId);
  const sellerItems = getSellerItems(order, sellerId);
  const confirmationSource = options.confirmationSource || 'seller_manual';

  if (sellerItems.every((item) => item.itemStatus === 'delivered')) {
    return getSellerOrderById(sellerId, order._id);
  }

  if (confirmationSource === 'seller_manual' && hasShiprocketShipment(order, sellerItems)) {
    throw new AppError('Shiprocket shipments must be marked delivered by the courier webhook', 400);
  }

  if (!sellerItems.every((item) => item.itemStatus === 'shipped')) {
    throw new AppError('Only shipped orders can be marked delivered', 400);
  }

  const deliveredAt = options.deliveredAt ? new Date(options.deliveredAt) : new Date();

  await adjustStockForLegacyDeliveredItems(sellerItems);

  forEachSellerItem(order, sellerId, (item) => {
    item.itemStatus = 'delivered';
    item.itemDeliveredAt = deliveredAt;
    item.returnEligible = item.returnEligible !== false;
  });

  updateComputedOrderStatus(order);
  order.deliveredAt = deliveredAt;
  order.trackingStatus = 'Delivered';
  order.inventoryReservation = order.inventoryReservation || {};
  order.inventoryReservation.status = 'consumed';
  order.deliveryInfo = order.deliveryInfo || {};
  order.deliveryInfo.deliveredAt = deliveredAt;
  order.deliveryInfo.deliveryConfirmedBy = confirmationSource;
  order.deliveryInfo.deliveryConfirmationStatus = 'confirmed';
  order.deliveryInfo.deliveryReviewRequired = false;
  order.deliveryInfo.deliveryReviewReason = '';
  order.deliveryInfo.deliveryReviewFlaggedAt = null;
  order.deliveryInfo.lastCourierStatus = options.courierStatus || order.deliveryInfo.lastCourierStatus || 'Delivered';
  order.deliveryInfo.lastCourierStatusAt = options.courierStatusAt ? new Date(options.courierStatusAt) : deliveredAt;
  order.deliveryInfo.returnWindowEndsAt = new Date(
    deliveredAt.getTime() + postOrderService.RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
  order.shiprocketRawData = options.rawWebhookPayload || order.shiprocketRawData || {};

  // Razorpay transfer holds are released by the earnings eligibility job
  // once the return window closes, not at delivery time.
  await order.save();

  const deliveredStoreIds = [
    ...new Set(
      sellerItems
        .map((item) => item.storeId?._id || item.storeId)
        .filter(Boolean)
        .map((storeId) => storeId.toString())
    )
  ];

  await Promise.all(deliveredStoreIds.map((storeId) => Store.updateOne(
    { _id: storeId },
    { $inc: { completedOrderCount: 1 } }
  )));

  return getSellerOrderById(sellerId, order._id);
};

const splitName = (fullName = '') => {
  const parts = fullName.trim().split(' ');
  return {
    first: parts[0] || fullName,
    last: parts.slice(1).join(' ') || '.'
  };
};

const buildPickupLocationName = (sellerId) => `notwhat_${sellerId.toString().slice(-12)}`;

const firstPresent = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const stringifyShiprocketDetail = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch (_err) {
    return 'unreadable Shiprocket response';
  }
};

const extractShiprocketShipmentId = (shiprocketOrder) => firstPresent(
  shiprocketOrder?.shipment_id,
  shiprocketOrder?.data?.shipment_id,
  shiprocketOrder?.response?.data?.shipment_id
);

const extractShiprocketOrderId = (shiprocketOrder) => firstPresent(
  shiprocketOrder?.order_id,
  shiprocketOrder?.data?.order_id,
  shiprocketOrder?.response?.data?.order_id
);

const describeShiprocketOrderResponse = (shiprocketOrder) => {
  const detail = firstPresent(
    shiprocketOrder?.message,
    shiprocketOrder?.error,
    shiprocketOrder?.errors,
    shiprocketOrder?.data?.message,
    shiprocketOrder?.data?.error,
    shiprocketOrder?.data?.errors,
    shiprocketOrder?.response?.message,
    shiprocketOrder?.response?.data?.message,
    shiprocketOrder?.response?.data?.errors
  );
  const status = firstPresent(
    shiprocketOrder?.status,
    shiprocketOrder?.status_code,
    shiprocketOrder?.data?.status,
    shiprocketOrder?.data?.status_code,
    shiprocketOrder?.response?.status,
    shiprocketOrder?.response?.status_code
  );

  return [stringifyShiprocketDetail(detail), status ? `status ${status}` : ''].filter(Boolean).join(' ');
};

const ensureShiprocketPickupLocation = async (profile, sellerId) => {
  const pa = profile.pickupAddress || {};
  const pickupLocationName = profile.shiprocketPickupName || buildPickupLocationName(sellerId);
  const seller = await User.findById(sellerId).select('email').lean();

  try {
    await shiprocket.registerPickupLocation({
      pickup_location: pickupLocationName,
      name: pa.name || profile.storeName,
      email: seller?.email || 'seller@notwhat.in',
      phone: pa.phone,
      address: pa.address,
      address_2: '',
      city: pa.city || profile.city,
      state: pa.state || profile.state,
      country: pa.country || 'India',
      pin_code: pa.pincode
    });
  } catch (err) {
    const shiprocketMsg = err.response?.data?.message || err.message;
    if (err.response?.status !== 422) {
      throw new AppError(`Shiprocket pickup registration failed: ${shiprocketMsg}`, 502);
    }
  }

  profile.shiprocketPickupName = pickupLocationName;
  await profile.save();

  return pickupLocationName;
};

const extractAwbCode = (awbResponse) => awbResponse?.response?.data?.awb_code
  || awbResponse?.response?.data?.awb
  || awbResponse?.awb_code
  || null;

const extractLabelUrl = (labelResponse) => {
  const label = labelResponse?.label_url || labelResponse?.labelUrl || '';
  return Array.isArray(label) ? (label[0] || '') : label;
};

const createShipmentForOrder = async (sellerId, orderId, dimensions) => {
  const order = await findSellerOrderForUpdate(sellerId, orderId);
  const sellerItems = getSellerItems(order, sellerId);

  if (sellerItems.length === 0) {
    throw new AppError('No items found for this seller in the order', 404);
  }

  if (order.orderStatus === 'awaiting_seller_acceptance' || sellerItems.some((item) => item.itemAcceptanceStatus === 'pending')) {
    throw new AppError('Accept this order before creating a shipment', 400);
  }

  if (sellerItems.every((item) => ['shipped', 'delivered', 'cancelled'].includes(item.itemStatus))) {
    throw new AppError('All items are already shipped, delivered, or cancelled', 400);
  }

  if (sellerItems.some((item) => item.itemStatus === 'shipped')) {
    throw new AppError('Some items are already shipped', 400);
  }

  const profile = await SellerProfile.findOne({ userId: sellerId });

  if (!profile) {
    throw new AppError('Seller profile not found', 404);
  }

  const pickupAddress = await addressService.resolvePickupAddressForShipment(sellerId, dimensions.pickupAddressId);
  const pickupSnapshot = addressService.pickupSnapshotFromAddress(pickupAddress.toObject ? pickupAddress.toObject() : pickupAddress);
  const pickupLocation = pickupSnapshot.shiprocketPickupLocationNickname || await ensureShiprocketPickupLocation(profile, sellerId);

  const deliverySnapshot = order.shippingAddressSnapshot?.postalCode
    ? order.shippingAddressSnapshot
    : addressService.shippingSnapshotFromAddress({
      contactName: order.shippingInfo?.name,
      contactPhone: order.shippingInfo?.phone,
      email: order.shippingInfo?.email,
      addressLine1: order.shippingInfo?.address,
      city: order.shippingInfo?.city,
      state: order.shippingInfo?.state,
      country: 'India',
      postalCode: order.shippingInfo?.postalCode
    });

  const {
    contactName: buyerFullName,
    contactPhone: buyerPhone,
    email: buyerEmail,
    addressLine1: buyerAddress,
    addressLine2: buyerAddress2,
    landmark: buyerLandmark,
    city: buyerCity,
    state: buyerState,
    country: buyerCountry,
    postalCode: buyerPincode
  } = deliverySnapshot;
  const { first: billingFirst, last: billingLast } = splitName(buyerFullName);

  if (!/^[1-9]\d{5}$/.test(buyerPincode || '') || !/^[1-9]\d{5}$/.test(pickupSnapshot.postalCode || '')) {
    throw new AppError('Pincode must be 6 digits.', 400);
  }

  const orderItems = sellerItems
    .filter((item) => !['cancelled'].includes(item.itemStatus))
    .map((item) => ({
      name: item.titleSnapshot,
      sku: item.productId.toString(),
      units: item.quantity,
      selling_price: item.priceSnapshot,
      discount: 0,
      tax: 0,
      hsn: 0
    }));

  const sellerSubtotal = sellerItems.reduce((sum, item) => sum + (item.itemTotal || 0), 0);

  let serviceability;

  try {
    serviceability = await shiprocket.getServiceability(
      pickupSnapshot.postalCode,
      buyerPincode,
      dimensions.weight,
      false
    );
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new AppError(`Shiprocket serviceability check failed: ${msg}`, 502);
  }

  const couriers = serviceability?.data?.available_courier_companies || [];

  if (couriers.length === 0) {
    throw new AppError('No courier available for this route. Check pickup and delivery pincodes.', 400);
  }

  const bestCourier = couriers[0];

  const shiprocketOrderPayload = {
    order_id: `${order.orderNumber}-${sellerId.toString().slice(-6)}`,
    order_date: new Date(order.createdAt).toISOString().replace('T', ' ').slice(0, 16),
    pickup_location: pickupLocation,
    billing_customer_name: billingFirst,
    billing_last_name: billingLast,
    billing_address: buyerAddress,
    billing_address_2: [buyerAddress2, buyerLandmark].filter(Boolean).join(', '),
    billing_city: buyerCity,
    billing_state: buyerState,
    billing_country: buyerCountry || 'India',
    billing_pincode: buyerPincode,
    billing_email: buyerEmail,
    billing_phone: buyerPhone,
    shipping_is_billing: 1,
    order_items: orderItems,
    payment_method: 'Prepaid',
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: sellerSubtotal,
    length: dimensions.length,
    breadth: dimensions.breadth,
    height: dimensions.height,
    weight: dimensions.weight
  };

  let shiprocketOrder;

  try {
    shiprocketOrder = await shiprocket.createOrder(shiprocketOrderPayload);
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new AppError(`Shiprocket order creation failed: ${msg}`, 502);
  }

  const shipmentId = extractShiprocketShipmentId(shiprocketOrder);
  const shiprocketOrderId = extractShiprocketOrderId(shiprocketOrder);

  if (!shipmentId) {
    const shiprocketDetail = describeShiprocketOrderResponse(shiprocketOrder);
    throw new AppError(`Shiprocket did not return a shipment ID${shiprocketDetail ? `: ${shiprocketDetail}` : ''}`, 502);
  }

  let awbResponse;

  try {
    awbResponse = await shiprocket.assignAwb(shipmentId, bestCourier.courier_company_id);
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new AppError(`AWB assignment failed: ${msg}`, 502);
  }

  const awbCode = awbResponse?.awb_assign_status === 1 ? extractAwbCode(awbResponse) : extractAwbCode(awbResponse);

  if (!awbCode) {
    throw new AppError('Shiprocket could not assign an AWB number', 502);
  }

  const courierName = bestCourier.courier_name || '';

  let labelUrl = '';

  try {
    const labelResponse = await shiprocket.generateLabel(shipmentId);
    labelUrl = extractLabelUrl(labelResponse);
  } catch (_err) {
    // Label generation can be retried later; don't fail the whole shipment
  }

  const now = new Date();

  forEachSellerItem(order, sellerId, (item) => {
    if (item.itemStatus !== 'cancelled') {
      item.itemStatus = 'shipped';
      item.itemShippedAt = now;
      item.itemTrackingNumber = awbCode;
      item.shiprocketOrderId = shiprocketOrderId;
      item.shiprocketShipmentId = shipmentId;
      item.shippingLabelUrl = labelUrl;
    }
  });

  updateComputedOrderStatus(order);
  order.trackingNumber = awbCode;
  order.trackingCarrier = courierName;
  order.trackingUrl = `https://shiprocket.co/tracking/${awbCode}`;
  order.shippingLabelUrl = labelUrl;
  order.shiprocketOrderId = shiprocketOrderId;
  order.shiprocketShipmentId = shipmentId;
  order.pickupAddressSnapshot = pickupSnapshot;
  order.shippedAt = now;
  order.trackingStatus = 'Shipped';

  await order.save();

  const updatedOrder = await getSellerOrderById(sellerId, order._id);

  return {
    ...updatedOrder,
    awbCode,
    courierName,
    shippingLabelUrl: labelUrl,
    shiprocketOrderId,
    shiprocketShipmentId: shipmentId
  };
};

module.exports = {
  getSellerOrders,
  getNewSellerOrders,
  getPendingAcceptanceOrders,
  listPendingAcceptanceForAdmin,
  getSellerOrderById,
  updateSellerOrderStatus,
  markSellerOrderShipped,
  cancelSellerOrder,
  acceptSellerOrder,
  rejectSellerOrder,
  forceAcceptOrder,
  forceCancelOrder,
  processExpiredAcceptanceOrders,
  markOrderDelivered,
  createShipmentForOrder,
  computeOrderStatus,
  toSellerOrderView
};
