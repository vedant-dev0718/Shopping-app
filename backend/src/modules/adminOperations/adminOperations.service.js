const mongoose = require('mongoose');

const AppError = require('../../utils/AppError');
const AnalyticsEvent = require('../analytics/analyticsEvent.model');
const CancellationRequest = require('../cancellations/cancellationRequest.model');
const Product = require('../products/product.model');
const Refund = require('../refunds/refund.model');
const ReturnRequest = require('../returns/return.model');
const Store = require('../stores/store.model');
const User = require('../users/user.model');
const Order = require('../orders/order.model');
const postOrderService = require('../orders/postOrder.service');
const sellerOrderService = require('../sellerOrders/sellerOrder.service');
const { logAction } = require('../adminManagement/adminManagement.service');

const objectId = (id) => new mongoose.Types.ObjectId(id);
const cleanUserSelect = 'name email phone role accountStatus';
const ORDER_STATUSES = [
  'created',
  'pending',
  'payment_pending',
  'payment_authorization_pending',
  'placed',
  'awaiting_seller_acceptance',
  'seller_accepted',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'partially_delivered',
  'cancelled',
  'return_requested',
  'return_approved',
  'return_rejected',
  'returned',
  'seller_rejected',
  'cancelled_unavailable',
  'acceptance_expired',
  'refunded'
];

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regex = (value) => new RegExp(escapeRegex(value), 'i');
const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const pagination = (query = {}) => {
  const page = Math.max(asNumber(query.page, 1), 1);
  const limit = Math.min(Math.max(asNumber(query.limit, 20), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const dateRange = (query = {}) => {
  const createdAt = {};
  if (query.fromDate) createdAt.$gte = new Date(query.fromDate);
  if (query.toDate) createdAt.$lte = new Date(query.toDate);
  return Object.keys(createdAt).length ? { createdAt } : {};
};

const sortFor = (sortBy) => {
  const map = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    amount_high: { finalTotal: -1 },
    amount_low: { finalTotal: 1 },
    updated: { updatedAt: -1 }
  };
  return map[sortBy] || map.newest;
};

const populateOrder = (query) => query
  .populate('buyerId', cleanUserSelect)
  .populate('sellerIds', cleanUserSelect)
  .populate('items.sellerId', cleanUserSelect)
  .populate('items.storeId')
  .populate('items.productId')
  .populate('returnInfo.reviewedBy', cleanUserSelect);

const pageResult = async (modelQuery, countQuery, query) => {
  const { page, limit, skip } = pagination(query);
  const [items, total] = await Promise.all([
    modelQuery.skip(skip).limit(limit).lean(),
    countQuery
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

const buildOrderFilter = async (query = {}) => {
  const filter = { ...dateRange(query) };

  if (query.orderStatus) filter.orderStatus = query.orderStatus;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.sellerAcceptanceStatus) filter['sellerAcceptance.status'] = query.sellerAcceptanceStatus;
  if (query.refundStatus) filter.refundStatus = query.refundStatus;
  if (query.returnStatus) filter['returnInfo.returnStatus'] = query.returnStatus;
  if (query.sellerId) filter.sellerIds = query.sellerId;
  if (query.buyerId) filter.buyerId = query.buyerId;
  if (query.storeId) filter['items.storeId'] = query.storeId;
  if (query.minAmount || query.maxAmount) {
    filter.finalTotal = {};
    if (query.minAmount) filter.finalTotal.$gte = Number(query.minAmount);
    if (query.maxAmount) filter.finalTotal.$lte = Number(query.maxAmount);
  }

  if (query.q) {
    const q = regex(query.q);
    const [buyerIds, sellerIds, productIds, storeIds] = await Promise.all([
      User.distinct('_id', { $or: [{ name: q }, { email: q }, { phone: q }] }),
      User.distinct('_id', { $or: [{ name: q }, { email: q }, { phone: q }], role: 'seller' }),
      Product.distinct('_id', { $or: [{ title: q }, { sku: q }, { barcode: q }] }),
      Store.distinct('_id', { $or: [{ storeName: q }, { city: q }, { state: q }, { region: q }] })
    ]);

    filter.$or = [
      { orderNumber: q },
      { razorpayPaymentId: q },
      { razorpayOrderId: q },
      { trackingNumber: q },
      { trackingCarrier: q },
      { 'paymentFlow.razorpayPaymentId': q },
      { 'paymentFlow.razorpayOrderId': q },
      { 'items.itemTrackingNumber': q },
      { 'items.titleSnapshot': q },
      { buyerId: { $in: buyerIds } },
      { sellerIds: { $in: sellerIds } },
      { 'items.sellerId': { $in: sellerIds } },
      { 'items.productId': { $in: productIds } },
      { 'items.storeId': { $in: storeIds } }
    ];
  }

  return filter;
};

const getMoneyBreakdown = (order) => {
  const totalRefundAmount = order.totalRefundedAmount || order.refundInfo?.refundAmount || 0;
  const platformCommission = order.totalPlatformCommission || order.commissionAmount || 0;
  const sellerNetEarnings = order.totalSellerEarnings || order.sellerPayoutAmount || 0;
  return {
    productSubtotal: order.totalProductAmount || order.subtotal || 0,
    shippingCharged: order.totalShippingAmount || order.shipping || 0,
    tax: order.gstAmount || 0,
    discount: order.discountAmount || 0,
    finalTotalPaidByBuyer: order.finalTotal || 0,
    razorpayFees: order.paymentFlow?.razorpayFees || order.refundInfo?.refundMetadata?.razorpayFees || 0,
    platformCommission,
    sellerNetEarnings,
    refundAmount: totalRefundAmount,
    netPlatformEarningAfterRefunds: Math.max(platformCommission - totalRefundAmount, 0),
    pendingPayout: ['pending', 'scheduled', 'route_transfer_initiated'].includes(order.payoutStatus) ? sellerNetEarnings : 0,
    paidPayout: ['paid', 'released'].includes(order.payoutStatus) ? sellerNetEarnings : 0
  };
};

const normalizeOrderListItem = (order) => ({
  _id: order._id,
  orderNumber: order.orderNumber,
  title: order.orderNumber,
  buyer: order.buyerId,
  buyerEmail: order.buyerId?.email || order.shippingInfo?.email || '',
  sellerNames: (order.sellerIds || []).map((seller) => seller?.name).filter(Boolean),
  finalTotal: order.finalTotal,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  sellerAcceptanceStatus: order.sellerAcceptance?.status || 'pending',
  refundStatus: order.refundStatus || order.refundInfo?.refundStatus || 'none',
  returnStatus: order.returnInfo?.returnStatus || 'none',
  trackingNumber: order.trackingNumber || '',
  trackingStatus: order.trackingStatus || '',
  razorpayPaymentId: order.razorpayPaymentId || order.paymentFlow?.razorpayPaymentId || '',
  razorpayOrderId: order.razorpayOrderId || order.paymentFlow?.razorpayOrderId || '',
  createdAt: order.createdAt,
  updatedAt: order.updatedAt
});

const listOrders = async (query = {}) => {
  const filter = await buildOrderFilter(query);
  const result = await pageResult(
    populateOrder(Order.find(filter).sort(sortFor(query.sortBy))),
    Order.countDocuments(filter),
    query
  );
  return {
    ...result,
    items: result.items.map(normalizeOrderListItem)
  };
};

const requireOrder = async (orderId) => {
  const order = await populateOrder(Order.findById(orderId)).lean();
  if (!order) throw new AppError('Order not found', 404);
  return order;
};

const buildTimeline = async (orderId) => {
  const order = await requireOrder(orderId);
  const [events, refunds, returns, cancellations, actionLogs] = await Promise.all([
    AnalyticsEvent.find({ 'metadata.orderId': objectId(orderId) }).sort({ createdAt: 1 }).lean(),
    Refund.find({ orderId }).sort({ createdAt: 1 }).lean(),
    ReturnRequest.find({ orderId }).sort({ requestedAt: 1, createdAt: 1 }).lean(),
    CancellationRequest.find({ orderId }).sort({ createdAt: 1 }).lean(),
    require('../adminManagement/adminActionLog.model').find({ targetType: { $in: ['order', 'refund', 'return', 'cancellation', 'shipment'] }, $or: [{ targetId: order._id }, { 'metadata.orderId': order._id.toString() }] }).sort({ createdAt: 1 }).lean()
  ]);

  const timeline = [
    { type: 'order_created', title: 'Order created', createdAt: order.createdAt },
    order.paymentFlow?.authorizedAt && { type: 'payment_authorized', title: 'Payment authorized', createdAt: order.paymentFlow.authorizedAt },
    order.paymentFlow?.capturedAt && { type: 'payment_captured', title: 'Payment captured', createdAt: order.paymentFlow.capturedAt },
    order.sellerAcceptance?.acceptedAt && { type: 'seller_accepted', title: 'Seller accepted', createdAt: order.sellerAcceptance.acceptedAt },
    order.sellerAcceptance?.rejectedAt && { type: 'seller_rejected', title: 'Seller rejected', createdAt: order.sellerAcceptance.rejectedAt, metadata: { reason: order.sellerAcceptance.rejectionReason } },
    order.shippedAt && { type: 'shipped', title: 'Order shipped', createdAt: order.shippedAt },
    (order.deliveredAt || order.deliveryInfo?.deliveredAt) && { type: 'delivered', title: 'Order delivered', createdAt: order.deliveredAt || order.deliveryInfo.deliveredAt },
    order.cancelledAt && { type: 'cancelled', title: 'Order cancelled', createdAt: order.cancelledAt, metadata: { reason: order.cancelReason } },
    order.refundInfo?.refundedAt && { type: 'refund_processed', title: 'Refund processed', createdAt: order.refundInfo.refundedAt },
    ...events.map((event) => ({ type: event.eventType, title: event.eventType.replace(/_/g, ' '), createdAt: event.createdAt, metadata: event.metadata })),
    ...refunds.map((refund) => ({ type: `refund_${refund.status}`, title: `Refund ${refund.status}`, createdAt: refund.updatedAt || refund.createdAt, metadata: { refundId: refund._id, amount: refund.amount, reason: refund.reason } })),
    ...returns.map((returnRequest) => ({ type: `return_${returnRequest.status}`, title: `Return ${returnRequest.status}`, createdAt: returnRequest.resolvedAt || returnRequest.returnReceivedAt || returnRequest.requestedAt || returnRequest.createdAt, metadata: { returnId: returnRequest._id, reason: returnRequest.reason } })),
    ...cancellations.map((cancellation) => ({ type: `cancellation_${cancellation.status}`, title: `Cancellation ${cancellation.status}`, createdAt: cancellation.updatedAt || cancellation.createdAt, metadata: { cancellationId: cancellation._id, reason: cancellation.reason } })),
    ...actionLogs.map((log) => ({ type: log.actionType, title: log.actionType.replace(/_/g, ' '), createdAt: log.createdAt, metadata: log.metadata }))
  ].filter(Boolean);

  return timeline.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
};

const getOrderDetail = async (orderId) => {
  const order = await requireOrder(orderId);
  const [refunds, returns, cancellations, timeline] = await Promise.all([
    Refund.find({ orderId }).sort({ createdAt: -1 }).populate('buyerId', cleanUserSelect).populate('sellerId', cleanUserSelect).lean(),
    ReturnRequest.find({ orderId }).sort({ requestedAt: -1, createdAt: -1 }).populate('buyerId', cleanUserSelect).populate('sellerId', cleanUserSelect).populate('reviewedBy', cleanUserSelect).lean(),
    CancellationRequest.find({ orderId }).sort({ createdAt: -1 }).populate('buyerId', cleanUserSelect).populate('sellerId', cleanUserSelect).populate('reviewedBy', cleanUserSelect).lean(),
    buildTimeline(orderId)
  ]);

  return {
    order,
    basics: normalizeOrderListItem(order),
    buyer: {
      user: order.buyerId,
      shippingInfo: order.shippingInfo
    },
    sellers: (order.sellerIds || []).map((seller) => ({
      seller,
      stores: (order.items || [])
        .filter((item) => item.sellerId?._id?.toString() === seller?._id?.toString())
        .map((item) => item.storeId)
        .filter(Boolean)
    })),
    products: (order.items || []).map((item) => ({
      orderItemId: item._id,
      productId: item.productId?._id || item.productId,
      productTitleSnapshot: item.titleSnapshot,
      currentProductTitle: item.productId?.title || '',
      sku: item.productId?.sku || '',
      barcode: item.productId?.barcode || '',
      quantity: item.quantity,
      itemPrice: item.priceSnapshot,
      itemSubtotal: item.itemSubtotal || item.itemTotal || 0,
      itemRefundAmount: item.refundAmount || 0,
      itemCommission: item.platformCommissionAmount || 0,
      sellerEarning: item.sellerEarningsAmount || item.sellerPayoutAmount || 0,
      itemStatus: item.itemStatus,
      itemAcceptanceStatus: item.itemAcceptanceStatus,
      payoutStatus: item.payoutStatus
    })),
    moneyBreakdown: getMoneyBreakdown(order),
    payment: {
      provider: 'Razorpay',
      razorpayOrderId: order.razorpayOrderId || order.paymentFlow?.razorpayOrderId || '',
      razorpayPaymentId: order.razorpayPaymentId || order.paymentFlow?.razorpayPaymentId || '',
      razorpayRefundId: order.refundInfo?.razorpayRefundId || order.paymentFlow?.razorpayRefundId || '',
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentCapturedAt: order.paymentFlow?.capturedAt || null,
      paymentFailedReason: order.paymentFlow?.failureReason || '',
      webhookEventsReceived: timeline.filter((event) => String(event.type).includes('webhook')).length,
      signatureVerified: order.paymentFlow?.signatureVerified ?? null
    },
    shipping: buildShipmentView(order),
    cancellation: {
      cancelInfo: order.cancelInfo || {},
      cancellations
    },
    return: {
      returnInfo: order.returnInfo || {},
      returns
    },
    refund: {
      refundInfo: order.refundInfo || {},
      refunds
    },
    timeline
  };
};

const updateOrderStatus = async (adminId, orderId, { orderStatus, trackingStatus = '', reason = '' }) => {
  if (!ORDER_STATUSES.includes(orderStatus)) throw new AppError('Invalid order status', 400);
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);
  const previousStatus = order.orderStatus;
  order.orderStatus = orderStatus;
  if (trackingStatus) order.trackingStatus = trackingStatus;
  await order.save();
  await logAction({ adminId, actionType: 'order_status_update', targetType: 'order', targetId: order._id, reason, metadata: { previousStatus, orderStatus } });
  return getOrderDetail(orderId);
};

const cancelOrder = async (adminId, orderId, { reason = 'Order cancelled by admin' } = {}) => {
  const order = await sellerOrderService.forceCancelOrder(adminId, orderId, reason);
  await logAction({ adminId, actionType: 'order_cancelled', targetType: 'order', targetId: orderId, reason });
  return getOrderDetail(order._id || orderId);
};

const forceAcceptOrder = async (adminId, orderId, body = {}) => {
  const order = await sellerOrderService.forceAcceptOrder(adminId, orderId);
  await logAction({ adminId, actionType: 'order_force_accepted', targetType: 'order', targetId: orderId, reason: body.reason || 'Force accepted by admin' });
  return getOrderDetail(order._id || orderId);
};

const forceRefundOrder = async (adminId, orderId, { amount, reason = 'Refund forced by admin' } = {}) => {
  const refund = await postOrderService.processRefundForOrder(orderId, { amount, reason, requestedBy: 'admin' });
  await logAction({ adminId, actionType: 'order_force_refund', targetType: 'order', targetId: orderId, reason, metadata: { refundId: refund._id, amount: refund.amount } });
  return refund;
};

const listPayments = async (query = {}) => {
  const filter = await buildOrderFilter({ ...query, paymentStatus: query.paymentStatus || query.status });
  filter.$or = filter.$or || [];
  if (!query.q) {
    filter.$or.push({ razorpayPaymentId: { $ne: '' } }, { 'paymentFlow.razorpayPaymentId': { $ne: '' } }, { paymentStatus: { $exists: true } });
  }
  const result = await pageResult(
    populateOrder(Order.find(filter).sort(sortFor(query.sortBy))),
    Order.countDocuments(filter),
    query
  );
  return {
    ...result,
    items: result.items.map((order) => ({
      _id: order._id,
      paymentId: order.razorpayPaymentId || order.paymentFlow?.razorpayPaymentId || order._id,
      orderNumber: order.orderNumber,
      buyer: order.buyerId,
      amount: order.finalTotal,
      provider: 'Razorpay',
      method: order.paymentMethod,
      status: order.paymentStatus,
      razorpayPaymentId: order.razorpayPaymentId || order.paymentFlow?.razorpayPaymentId || '',
      razorpayOrderId: order.razorpayOrderId || order.paymentFlow?.razorpayOrderId || '',
      createdAt: order.createdAt
    }))
  };
};

const getPaymentByOrder = async (paymentId) => getOrderDetail(paymentId);

const getPaymentByRazorpay = async (razorpayPaymentId) => {
  const order = await Order.findOne({
    $or: [{ razorpayPaymentId }, { 'paymentFlow.razorpayPaymentId': razorpayPaymentId }]
  });
  if (!order) throw new AppError('Payment not found', 404);
  return getOrderDetail(order._id);
};

const refundPopulate = (query) => query.populate('orderId', 'orderNumber orderStatus paymentStatus refundStatus finalTotal createdAt').populate('buyerId', cleanUserSelect).populate('sellerId', cleanUserSelect);
const returnPopulate = (query) => query.populate('orderId', 'orderNumber orderStatus paymentStatus returnInfo refundStatus finalTotal createdAt').populate('buyerId', cleanUserSelect).populate('sellerId', cleanUserSelect).populate('reviewedBy', cleanUserSelect);
const cancellationPopulate = (query) => query.populate('orderId', 'orderNumber orderStatus paymentStatus cancelInfo refundStatus finalTotal createdAt').populate('buyerId', cleanUserSelect).populate('sellerId', cleanUserSelect).populate('reviewedBy', cleanUserSelect);

const listRefunds = async (query = {}) => {
  const filter = { ...dateRange(query) };
  if (query.status) filter.status = query.status;
  if (query.q) {
    const q = regex(query.q);
    const orderIds = await Order.distinct('_id', { $or: [{ orderNumber: q }, { razorpayPaymentId: q }, { razorpayOrderId: q }] });
    filter.$or = [{ razorpayPaymentId: q }, { razorpayRefundId: q }, { reason: q }, { orderId: { $in: orderIds } }];
  }
  return pageResult(refundPopulate(Refund.find(filter).sort({ createdAt: -1 })), Refund.countDocuments(filter), query);
};

const getRefund = async (refundId) => {
  const refund = await refundPopulate(Refund.findById(refundId)).lean();
  if (!refund) throw new AppError('Refund not found', 404);
  return refund;
};

const markRefund = async (adminId, refundId, status, body = {}) => {
  const refund = await postOrderService.markRefund(refundId, status, body.failureReason || '');
  await logAction({ adminId, actionType: `refund_${status}`, targetType: 'refund', targetId: refundId, reason: body.reason || body.failureReason || '', metadata: { orderId: refund.orderId?.toString?.() || refund.orderId } });
  return getRefund(refundId);
};

const listReturns = async (query = {}) => {
  const filter = { ...dateRange(query) };
  if (query.status) filter.status = query.status;
  if (query.q) {
    const q = regex(query.q);
    const orderIds = await Order.distinct('_id', { orderNumber: q });
    filter.$or = [{ reason: q }, { description: q }, { orderId: { $in: orderIds } }];
  }
  return pageResult(returnPopulate(ReturnRequest.find(filter).sort({ requestedAt: -1, createdAt: -1 })), ReturnRequest.countDocuments(filter), query);
};

const getReturn = async (returnId) => {
  const returnRequest = await returnPopulate(ReturnRequest.findById(returnId)).lean();
  if (!returnRequest) throw new AppError('Return not found', 404);
  return returnRequest;
};

const approveReturn = async (adminId, returnId, body = {}) => {
  const returnRequest = await postOrderService.reviewReturn(adminId, returnId, { approved: true }, 'admin');
  await logAction({ adminId, actionType: 'return_approved', targetType: 'return', targetId: returnId, reason: body.reason || '', metadata: { orderId: returnRequest.orderId?.toString?.() || returnRequest.orderId } });
  return getReturn(returnId);
};

const rejectReturn = async (adminId, returnId, body = {}) => {
  const returnRequest = await postOrderService.reviewReturn(adminId, returnId, { approved: false, rejectionReason: body.rejectionReason || body.reason || 'Rejected by admin' }, 'admin');
  await logAction({ adminId, actionType: 'return_rejected', targetType: 'return', targetId: returnId, reason: body.rejectionReason || body.reason || '', metadata: { orderId: returnRequest.orderId?.toString?.() || returnRequest.orderId } });
  return getReturn(returnId);
};

const markReturnReceived = async (adminId, returnId, body = {}) => {
  const returnRequest = await ReturnRequest.findById(returnId);
  if (!returnRequest) throw new AppError('Return not found', 404);
  const result = await postOrderService.markReturnReceived(returnRequest.sellerId, returnId);
  await logAction({ adminId, actionType: 'return_received', targetType: 'return', targetId: returnId, reason: body.reason || '', metadata: { orderId: returnRequest.orderId?.toString?.() || returnRequest.orderId } });
  return getReturn(result._id || returnId);
};

const refundReturn = async (adminId, returnId, body = {}) => {
  const returnRequest = await ReturnRequest.findById(returnId);
  if (!returnRequest) throw new AppError('Return not found', 404);
  const refund = await postOrderService.processRefundForOrder(returnRequest.orderId, {
    amount: body.amount || returnRequest.refundAmount,
    reason: body.reason || returnRequest.reason,
    requestedBy: 'admin',
    returnId
  });
  returnRequest.refundStatus = refund.status === 'refunded' ? 'completed' : 'initiated';
  await returnRequest.save();
  await logAction({ adminId, actionType: 'return_refund', targetType: 'return', targetId: returnId, reason: body.reason || '', metadata: { orderId: returnRequest.orderId?.toString?.() || returnRequest.orderId, refundId: refund._id } });
  return getReturn(returnId);
};

const listCancellations = async (query = {}) => {
  const filter = { ...dateRange(query) };
  if (query.status) filter.status = query.status;
  if (query.q) {
    const q = regex(query.q);
    const orderIds = await Order.distinct('_id', { orderNumber: q });
    filter.$or = [{ reason: q }, { rejectionReason: q }, { orderId: { $in: orderIds } }];
  }
  return pageResult(cancellationPopulate(CancellationRequest.find(filter).sort({ createdAt: -1 })), CancellationRequest.countDocuments(filter), query);
};

const getCancellation = async (cancellationId) => {
  const cancellation = await cancellationPopulate(CancellationRequest.findById(cancellationId)).lean();
  if (!cancellation) throw new AppError('Cancellation not found', 404);
  return cancellation;
};

const approveCancellation = async (adminId, cancellationId, body = {}) => {
  const cancellation = await CancellationRequest.findById(cancellationId);
  if (!cancellation) throw new AppError('Cancellation not found', 404);
  const order = await postOrderService.approveCancellation(adminId, cancellation.orderId, 'admin');
  await logAction({ adminId, actionType: 'cancellation_approved', targetType: 'cancellation', targetId: cancellationId, reason: body.reason || cancellation.reason, metadata: { orderId: cancellation.orderId?.toString?.() || cancellation.orderId } });
  return { cancellation: await getCancellation(cancellationId), order };
};

const rejectCancellation = async (adminId, cancellationId, body = {}) => {
  const cancellation = await CancellationRequest.findById(cancellationId);
  if (!cancellation) throw new AppError('Cancellation not found', 404);
  const reason = body.rejectionReason || body.reason || 'Rejected by admin';
  const order = await postOrderService.rejectCancellation(adminId, cancellation.orderId, reason, 'admin');
  await logAction({ adminId, actionType: 'cancellation_rejected', targetType: 'cancellation', targetId: cancellationId, reason, metadata: { orderId: cancellation.orderId?.toString?.() || cancellation.orderId } });
  return { cancellation: await getCancellation(cancellationId), order };
};

const buildShipmentView = (order) => ({
  _id: order._id,
  shipmentId: order.shiprocketShipmentId || order.items?.find((item) => item.shiprocketShipmentId)?.shiprocketShipmentId || order._id,
  orderId: order._id,
  orderNumber: order.orderNumber,
  buyer: order.buyerId,
  sellers: order.sellerIds,
  provider: 'Shiprocket',
  shiprocketOrderId: order.shiprocketOrderId || order.items?.find((item) => item.shiprocketOrderId)?.shiprocketOrderId || null,
  shiprocketShipmentId: order.shiprocketShipmentId || order.items?.find((item) => item.shiprocketShipmentId)?.shiprocketShipmentId || null,
  awb: order.trackingNumber || order.items?.find((item) => item.itemTrackingNumber)?.itemTrackingNumber || '',
  courier: order.trackingCarrier || '',
  trackingUrl: order.trackingUrl || '',
  currentStatus: order.trackingStatus || order.orderStatus,
  shippedAt: order.shippedAt || null,
  deliveredAt: order.deliveredAt || order.deliveryInfo?.deliveredAt || null,
  shippingLabelUrl: order.shippingLabelUrl || order.items?.find((item) => item.shippingLabelUrl)?.shippingLabelUrl || '',
  timeline: [
    order.createdAt && { title: 'Order created', status: 'created', createdAt: order.createdAt },
    order.shippedAt && { title: 'Shipped', status: 'shipped', createdAt: order.shippedAt },
    (order.deliveredAt || order.deliveryInfo?.deliveredAt) && { title: 'Delivered', status: 'delivered', createdAt: order.deliveredAt || order.deliveryInfo.deliveredAt }
  ].filter(Boolean),
  rawData: order.shiprocketRawData || {}
});

const buildShipmentFilter = async (query = {}) => {
  const filter = {
    ...dateRange(query),
    $or: [
      { shiprocketShipmentId: { $ne: null } },
      { shiprocketOrderId: { $ne: null } },
      { trackingNumber: { $ne: '' } },
      { shippingLabelUrl: { $ne: '' } },
      { 'items.shiprocketShipmentId': { $ne: null } },
      { 'items.itemTrackingNumber': { $ne: '' } }
    ]
  };
  if (query.status) filter.trackingStatus = regex(query.status);
  if (query.q) {
    const q = regex(query.q);
    filter.$and = [{ $or: filter.$or }, { $or: [{ orderNumber: q }, { trackingNumber: q }, { trackingCarrier: q }, { trackingUrl: q }, { 'items.itemTrackingNumber': q }] }];
    delete filter.$or;
  }
  return filter;
};

const listShipments = async (query = {}) => {
  const filter = await buildShipmentFilter(query);
  const result = await pageResult(populateOrder(Order.find(filter).sort(sortFor(query.sortBy))), Order.countDocuments(filter), query);
  return { ...result, items: result.items.map(buildShipmentView) };
};

const findShipmentOrder = async (shipmentId) => {
  const order = await populateOrder(Order.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(shipmentId) ? shipmentId : null },
      { shiprocketShipmentId: Number(shipmentId) || null },
      { shiprocketOrderId: Number(shipmentId) || null },
      { 'items.shiprocketShipmentId': Number(shipmentId) || null }
    ]
  })).lean();
  if (!order) throw new AppError('Shipment not found', 404);
  return order;
};

const getShipment = async (shipmentId) => buildShipmentView(await findShipmentOrder(shipmentId));

const getShipmentByAwb = async (awbCode) => {
  const order = await populateOrder(Order.findOne({ $or: [{ trackingNumber: awbCode }, { 'items.itemTrackingNumber': awbCode }] })).lean();
  if (!order) throw new AppError('Shipment not found', 404);
  return buildShipmentView(order);
};

const updateShipmentStatus = async (adminId, shipmentId, { status, trackingNumber = '', courier = '', trackingUrl = '', reason = '' }) => {
  const order = await Order.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(shipmentId) ? shipmentId : null },
      { shiprocketShipmentId: Number(shipmentId) || null },
      { 'items.shiprocketShipmentId': Number(shipmentId) || null }
    ]
  });
  if (!order) throw new AppError('Shipment not found', 404);
  const previousStatus = order.trackingStatus;
  order.trackingStatus = status || previousStatus;
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (courier) order.trackingCarrier = courier;
  if (trackingUrl) order.trackingUrl = trackingUrl;
  if (/delivered/i.test(order.trackingStatus)) {
    order.orderStatus = 'delivered';
    order.deliveredAt = order.deliveredAt || new Date();
    order.deliveryInfo = order.deliveryInfo || {};
    order.deliveryInfo.deliveredAt = order.deliveryInfo.deliveredAt || order.deliveredAt;
  }
  await order.save();
  await logAction({ adminId, actionType: 'shipment_status_update', targetType: 'shipment', targetId: order._id, reason, metadata: { previousStatus, status: order.trackingStatus, orderId: order._id.toString() } });
  return getShipment(order._id);
};

const refreshTracking = async (adminId, shipmentId) => {
  const shipment = await getShipment(shipmentId);
  await logAction({ adminId, actionType: 'shipment_tracking_refreshed', targetType: 'shipment', targetId: shipment.orderId, reason: 'Tracking refreshed by admin', metadata: { orderId: shipment.orderId.toString(), refreshedAt: new Date() } });
  return {
    ...shipment,
    refreshedAt: new Date(),
    refreshNote: 'No Shiprocket tracking pull endpoint is configured; returned stored shipment data.'
  };
};

module.exports = {
  listOrders,
  getOrderDetail,
  updateOrderStatus,
  cancelOrder,
  forceAcceptOrder,
  forceRefundOrder,
  buildTimeline,
  listPayments,
  getPaymentByOrder,
  getPaymentByRazorpay,
  listRefunds,
  getRefund,
  markRefund,
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
