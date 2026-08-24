const mongoose = require('mongoose');

const AppError = require('../../utils/AppError');
const env = require('../../config/env');
const { PLATFORM_COMMISSION_RATE, calculateCommission, extractGSTFromInclusivePrice, GST_RATE } = require('../../config/commissionConfig');
const analyticsService = require('../analytics/analytics.service');
const financeService = require('../finance/finance.service');
const Product = require('../products/product.model');
const User = require('../users/user.model');
const SellerProfile = require('../sellers/sellerProfile.model');
const Bid = require('../bargain/bid.model');
const cartService = require('../cart/cart.service');
const Order = require('../orders/order.model');
const addressService = require('../addresses/address.service');
const {
  razorpay,
  createManualCaptureOrder,
  fetchPayment,
  verifyPaymentSignature
} = require('../../utils/razorpay');
const { sendEmail } = require('../../utils/email');
const { buildUpiQrPayload } = require('../../utils/upiQr');
const {
  buildOrderConfirmationEmail,
  buildNewOrderAlertEmail
} = require('../../utils/emailTemplates');

const ONLINE_PAYMENT_METHODS = ['UPI', 'card', 'netbanking', 'wallet'];
const COD_PAYMENT_METHOD = 'COD';

const roundMoney = (value) => Math.round(value * 100) / 100;

const storeKeyOf = (product) => (product?.storeId?._id || product?.storeId || '').toString();

/** Splits cart-level shipping across store orders so the buyer total matches the checkout quote. */
const splitShippingAcrossGroups = (groupSubtotals, totalShipping) => {
  const combined = groupSubtotals.reduce((total, value) => total + value, 0);

  if (totalShipping <= 0 || combined <= 0) {
    return groupSubtotals.map(() => 0);
  }

  const shares = groupSubtotals.map((subtotal) => roundMoney(totalShipping * (subtotal / combined)));
  const drift = roundMoney(totalShipping - shares.reduce((total, value) => total + value, 0));
  shares[shares.length - 1] = roundMoney(shares[shares.length - 1] + drift);

  return shares;
};

const buildStorePaymentGroups = async (cart) => {
  const groups = new Map();

  for (const item of cart.items || []) {
    const product = item.productId;
    const storeId = product?.storeId?._id || product?.storeId || '';
    const storeName = product?.storeId?.storeName || 'Store';
    const sellerId = product?.sellerId || '';

    if (!storeId) {
      continue;
    }

    if (!groups.has(storeId.toString())) {
      groups.set(storeId.toString(), {
        storeId: storeId.toString(),
        sellerId: sellerId.toString ? sellerId.toString() : '',
        storeName,
        paymentMethods: [COD_PAYMENT_METHOD],
        amount: 0,
        currency: 'INR',
        items: []
      });
    }

    const group = groups.get(storeId.toString());
    const itemTotal = roundMoney(Number(item.quantity || 0) * Number(item.priceSnapshot || 0));

    group.items.push({
      productId: product?._id || '',
      title: product?.title || '',
      quantity: item.quantity,
      itemTotal
    });
    group.amount += itemTotal;
  }

  const sellerIds = Array.from(groups.values())
    .map((group) => group.sellerId)
    .filter(Boolean);
  const sellerProfiles = sellerIds.length > 0
    ? await SellerProfile.find({ userId: { $in: sellerIds } }).select('userId upiId').lean()
    : [];
  const upiIdBySellerId = new Map(
    sellerProfiles.map((profile) => [profile.userId.toString(), profile.upiId || ''])
  );

  return Array.from(groups.values()).map((group) => {
    const amount = roundMoney(group.amount);
    const upiId = upiIdBySellerId.get(group.sellerId) || '';
    const qrCode = buildUpiQrPayload({ upiId, storeName: group.storeName, amount });

    return {
      ...group,
      amount,
      upiId,
      qrCode,
      qrCodeLabel: qrCode
        ? `Scan to pay ${group.storeName}`
        : `Pay ${COD_PAYMENT_METHOD} to ${group.storeName}`
    };
  });
};
const toPaise = (value) => Math.round(roundMoney(Number(value) || 0) * 100);

const getSellerAcceptanceExpiresAt = () => {
  const minutes = Number.isFinite(env.sellerAcceptanceWindowMinutes)
    ? env.sellerAcceptanceWindowMinutes
    : 240;

  return new Date(Date.now() + minutes * 60 * 1000);
};

const getAuthorizationExpiresAt = () => {
  const minutes = Number.isFinite(env.razorpayAuthorizationTimeoutMinutes)
    ? env.razorpayAuthorizationTimeoutMinutes
    : 240;

  return new Date(Date.now() + minutes * 60 * 1000);
};

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `NW-${timestamp}-${random}`;
};

const shouldUseTransactions = () => {
  return env.mongoUri.startsWith('mongodb+srv://') || env.mongoUri.includes('replicaSet=');
};

const runMaybeTransaction = async (operation) => {
  if (!shouldUseTransactions()) {
    return operation();
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await operation(session);
    });

    return result;
  } finally {
    session.endSession();
  }
};

const getCheckoutCart = async (buyerId, options = {}) => {
  const { session } = options;
  const cart = await cartService.getOrCreateCart(buyerId, { session });

  if (cart.items.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  cartService.recalculateCartTotals(cart);
  await cart.save({ session });

  return cart.populate({
    path: 'items.productId',
    select: 'title description productLink category region price stock imageUrls status storeId sellerId',
    populate: {
      path: 'storeId',
      select: 'storeName profileImageUrl verified city state region category'
    }
  });
};

const validateCartForCheckout = async (cart, options = {}) => {
  const { session } = options;
  const orderItems = [];

  for (const item of cart.items) {
    const product = await Product.findById(item.productId._id || item.productId).session(session || null);

    if (!product || product.status !== 'active' || product.stock <= 0) {
      throw new AppError('Cart contains unavailable products. Please update your cart.', 400);
    }

    if (item.quantity > product.stock) {
      throw new AppError(`Quantity for ${product.title} exceeds available stock`, 400);
    }

    orderItems.push({
      product,
      quantity: item.quantity,
      priceSnapshot: item.priceSnapshot,
      itemTotal: roundMoney(item.quantity * item.priceSnapshot)
    });
  }

  return orderItems;
};

const mapOrderPaymentStatusToBidPaymentStatus = (orderPaymentStatus) => {
  const normalized = String(orderPaymentStatus || '').toLowerCase();

  if (normalized === 'paid') {
    return 'captured';
  }

  if (normalized === 'authorized') {
    return 'authorized';
  }

  if (normalized === 'failed') {
    return 'failed';
  }

  if (normalized === 'pending') {
    return 'pending';
  }

  return 'authorized';
};

const syncBargainBidsForOrder = async ({ cart, buyerId, order, session, productIds = null }) => {
  const scopedCartItems = cart.items.filter((cartItem) => {
    if (!productIds) return true;
    const productId = (cartItem.productId?._id || cartItem.productId || '').toString();
    return productIds.has(productId);
  });

  const bargainBidIds = [...new Set(
    scopedCartItems
      .map((item) => item.bargainBidId)
      .filter(Boolean)
      .map((value) => value.toString())
  )];

  if (bargainBidIds.length === 0) {
    return;
  }

  const bids = await Bid.find({
    _id: { $in: bargainBidIds },
    buyerId
  }).session(session || null);
  const bidById = new Map(bids.map((bid) => [bid._id.toString(), bid]));
  const now = new Date();
  const nextBidPaymentStatus = mapOrderPaymentStatusToBidPaymentStatus(order.paymentStatus);

  for (const cartItem of scopedCartItems) {
    if (!cartItem.bargainBidId) {
      continue;
    }

    const bid = bidById.get(cartItem.bargainBidId.toString());
    if (!bid) {
      continue;
    }

    if (bid.orderId && bid.orderId.toString() !== order._id.toString()) {
      throw new AppError('Accepted bid is already linked to another order', 409);
    }

    bid.orderId = order._id;
    bid.bidStatus = 'won';
    bid.paymentStatus = nextBidPaymentStatus;
    bid.sellerDecision = {
      ...(bid.sellerDecision || {}),
      decision: 'accepted',
      decidedAt: bid.sellerDecision?.decidedAt || now,
      messageToBuyer: 'Order placed from accepted bid.'
    };
    bid.razorpay = {
      ...(bid.razorpay || {}),
      capturedAt: nextBidPaymentStatus === 'captured' ? (bid.razorpay?.capturedAt || now) : bid.razorpay?.capturedAt,
      captureAmount: nextBidPaymentStatus === 'captured'
        ? Math.round(((Number(cartItem.priceSnapshot) || 0) * (Number(cartItem.quantity) || 0)) * 100)
        : (bid.razorpay?.captureAmount || 0),
      captureFailureReason: ''
    };

    await bid.save({ session });
  }
};

const validatePaymentAmountMatchesCart = (payment, cart) => {
  const expectedAmount = toPaise(cart.finalTotal);
  const paidAmount = Number(payment?.amount);

  if (!Number.isFinite(paidAmount)) {
    throw new AppError('Unable to verify payment amount against cart total', 400);
  }

  if (Math.round(paidAmount) !== expectedAmount) {
    throw new AppError(
      `Payment amount mismatch: expected ${expectedAmount} paise but received ${Math.round(paidAmount)} paise`,
      400
    );
  }
};

const getSupportedPaymentMethods = () => {
  if (env.enableCodCheckout) {
    return [COD_PAYMENT_METHOD];
  }

  return [];
};

const startCheckout = async (buyerId) => {
  const cart = await getCheckoutCart(buyerId);
  await validateCartForCheckout(cart);

  let razorpayOrderAmount = Math.round(cart.finalTotal * 100);
  let razorpayOrderId;

  if (env.razorpayKeyId && env.razorpayKeySecret) {
    const orderPayload = {
      amount: razorpayOrderAmount,
      currency: 'INR',
      receipt: `nw_${buyerId.toString().slice(-8)}_${Date.now().toString(36)}`,
      notes: { buyerId: buyerId.toString() }
    };
    const razorpayOrder = env.razorpayManualCaptureEnabled
      ? await createManualCaptureOrder(orderPayload)
      : await razorpay.orders.create({
        ...orderPayload,
        payment_capture: 1
      });
    razorpayOrderId = razorpayOrder.id;
    razorpayOrderAmount = razorpayOrder.amount;
  } else {
    razorpayOrderId = `mock_order_${Date.now()}`;
  }

  await Promise.all(cart.items.map((item) => {
    const product = item.productId;

    return analyticsService.trackEventSafe({
      userId: buyerId,
      sellerId: product.sellerId,
      storeId: product.storeId,
      productId: product._id,
      eventType: 'checkout_start',
      metadata: {
        quantity: item.quantity,
        priceSnapshot: item.priceSnapshot,
        cartTotal: cart.finalTotal
      }
    });
  }));

  return {
    cart,
    razorpayKeyId: env.razorpayKeyId || '',
    razorpayOrderId,
    razorpayOrderAmount,
    shippingOptions: [
      {
        label: cart.shipping === 0 ? 'Free shipping' : 'Standard shipping',
        amount: cart.shipping
      }
    ],
    paymentMethods: getSupportedPaymentMethods(),
    storePaymentGroups: await buildStorePaymentGroups(cart)
  };
};

const reduceProductStock = async (orderItems, options = {}) => {
  const { session } = options;

  for (const orderItem of orderItems) {
    const nextStock = Math.max(orderItem.product.stock - orderItem.quantity, 0);
    const update = {
      $inc: { stock: -orderItem.quantity }
    };

    if (nextStock === 0) {
      update.$set = { status: 'sold_out' };
    }

    const result = await Product.updateOne(
      {
        _id: orderItem.product._id,
        status: 'active',
        stock: { $gte: orderItem.quantity }
      },
      update,
      { session }
    );

    if (result.modifiedCount !== 1) {
      throw new AppError(`Quantity for ${orderItem.product.title} exceeds available stock`, 400);
    }
  }
};

const applyPendingAcceptanceDefaults = (items) => items.map((item) => ({
  ...item,
  itemStatus: 'awaiting_seller_acceptance',
  itemAcceptanceStatus: 'pending'
}));

const buildOrderConfirmation = (order) => ({
  orderNumber: order.orderNumber,
  orderId: order._id,
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  trackingStatus: order.trackingStatus,
  finalTotal: order.finalTotal,
  emailSent: order.emailSent
});

const sendOrderEmails = async (order) => {
  const sellerIds = [...new Set(order.items.map((item) => item.sellerId.toString()))];
  const sellers = await User.find({ _id: { $in: sellerIds } }).select('email').lean();
  const sellerEmailById = new Map(sellers.map((seller) => [seller._id.toString(), seller.email]));
  const emails = [buildOrderConfirmationEmail(order)];

  sellerIds.forEach((sellerId) => {
    const sellerItems = order.items.filter((item) => item.sellerId.toString() === sellerId);
    const sellerSubtotal = sellerItems.reduce((total, item) => total + (item.itemTotal || 0), 0);
    const sellerEmail = sellerEmailById.get(sellerId);

    if (!sellerEmail) {
      return;
    }

    emails.push(buildNewOrderAlertEmail(
      order,
      sellerEmail,
      sellerItems,
      sellerSubtotal,
      order.commissionRate || PLATFORM_COMMISSION_RATE
    ));
  });

  const results = await Promise.all(emails.map((email) => sendEmail(email)));
  const allSent = results.every(Boolean);

  if (allSent) {
    order.emailSent = true;
    await order.save();
  }

  return allSent;
};

const verifyAndPlaceOrder = async (
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  buyerId,
  addressInput,
  paymentMethod
) => {
  if (!ONLINE_PAYMENT_METHODS.includes(paymentMethod)) {
    throw new AppError('COD is not allowed on /checkout/verify. Use /checkout/place-cod', 400);
  }

  const signatureIsValid = verifyPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  });

  if (!signatureIsValid) {
    throw new AppError('Payment verification failed', 400);
  }

  const existingOrder = await Order.findOne({ buyerId, razorpayOrderId });

  if (existingOrder) {
    return buildOrderConfirmation(existingOrder);
  }

  const paymentCaptureMode = env.razorpayManualCaptureEnabled ? 'manual' : 'automatic';
  let verifiedPaymentStatus = env.razorpayManualCaptureEnabled ? 'authorized' : 'paid';
  let verifiedPayment = null;

  if (env.nodeEnv === 'production' || env.razorpayManualCaptureEnabled) {
    const payment = await fetchPayment(razorpayPaymentId);
    const acceptableStatuses = env.razorpayManualCaptureEnabled
      ? ['authorized', 'captured']
      : ['captured'];

    if (!payment || !acceptableStatuses.includes(payment.status) || payment.order_id !== razorpayOrderId) {
      throw new AppError('Payment verification failed', 400);
    }

    verifiedPayment = payment;
    verifiedPaymentStatus = payment.status === 'authorized' ? 'authorized' : 'paid';
  }

  let order;
  let items = [];
  const buyer = await User.findById(buyerId).select('email').lean();
  const delivery = await addressService.resolveDeliveryAddressForOrder(buyerId, addressInput);
  if (!delivery.shippingInfo.email) {
    delivery.shippingInfo.email = buyer?.email || 'buyer@notwhat.in';
    delivery.snapshot.email = delivery.shippingInfo.email;
  }

  await runMaybeTransaction(async (session) => {
    const cart = await getCheckoutCart(buyerId, { session });

    if (verifiedPayment) {
      validatePaymentAmountMatchesCart(verifiedPayment, cart);
    }

    const checkoutItems = await validateCartForCheckout(cart, { session });
    const orderNumber = generateOrderNumber();
    items = applyPendingAcceptanceDefaults(await financeService.applyFinancialsToOrderItems(checkoutItems.map((item) => ({
      productId: item.product._id,
      sellerId: item.product.sellerId,
      storeId: item.product.storeId,
      titleSnapshot: item.product.title,
      imageSnapshot: Array.isArray(item.product.imageUrls) && item.product.imageUrls.length > 0
        ? item.product.imageUrls[0]
        : '',
      quantity: item.quantity,
      priceSnapshot: item.priceSnapshot,
      itemTotal: item.itemTotal
    }))));
    const sellerIds = [...new Set(items.map((item) => item.sellerId.toString()))];
    const financialTotals = financeService.summarizeOrderFinancials(items, cart.shipping);
    const commission = calculateCommission(cart.subtotal);
    const gstAmount = extractGSTFromInclusivePrice(cart.finalTotal);

    const sellerAcceptanceExpiresAt = getSellerAcceptanceExpiresAt();
    const authorizationExpiresAt = getAuthorizationExpiresAt();

    const [createdOrder] = await Order.create([{
      buyerId,
      orderNumber,
      sellerIds,
      items,
      shippingInfo: delivery.shippingInfo,
      shippingAddressSnapshot: delivery.snapshot,
      paymentMethod,
      paymentCaptureMode,
      razorpayOrderId,
      razorpayPaymentId,
      paymentStatus: verifiedPaymentStatus,
      orderStatus: 'awaiting_seller_acceptance',
      trackingStatus: 'Waiting for seller confirmation',
      sellerAcceptance: {
        status: 'pending',
        expiresAt: sellerAcceptanceExpiresAt
      },
      paymentFlow: {
        captureAfterSellerAcceptance: env.razorpayManualCaptureEnabled,
        razorpayOrderId,
        razorpayPaymentId,
        signatureVerified: true,
        authorizedAt: verifiedPaymentStatus === 'authorized' ? new Date() : null,
        capturedAt: verifiedPaymentStatus === 'paid' ? new Date() : null,
        authorizationExpiresAt
      },
      razorpay: {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signatureVerified: true,
        authorizedAt: verifiedPaymentStatus === 'authorized' ? new Date() : null,
        capturedAt: verifiedPaymentStatus === 'paid' ? new Date() : null,
        captureAmount: verifiedPaymentStatus === 'paid' ? (verifiedPayment?.amount || Math.round(cart.finalTotal * 100)) : 0,
        captureResponseSafeSummary: verifiedPayment ? {
          id: verifiedPayment.id || '',
          orderId: verifiedPayment.order_id || '',
          status: verifiedPayment.status || '',
          amount: verifiedPayment.amount || 0,
          currency: verifiedPayment.currency || 'INR'
        } : {},
        authorizationExpiresAt
      },
      inventoryConfirmation: {
        confirmedAvailable: false
      },
      inventoryReservation: {
        reservationIds: [],
        expiresAt: sellerAcceptanceExpiresAt,
        status: 'active'
      },
      subtotal: cart.subtotal,
      shipping: cart.shipping,
      finalTotal: cart.finalTotal,
      commissionRate: PLATFORM_COMMISSION_RATE,
      commissionAmount: financialTotals.totalPlatformCommission || commission.commissionAmount,
      sellerPayoutAmount: financialTotals.totalSellerEarnings || commission.sellerPayoutAmount,
      ...financialTotals,
      payoutStatus: 'pending',
      gstAmount,
      gstRate: GST_RATE,
      emailSent: false
    }], { session });

    await syncBargainBidsForOrder({
      cart,
      buyerId,
      order: createdOrder,
      session
    });

    await cartService.clearCart(buyerId, { session });
    order = createdOrder;
  });

  await Promise.all(items.map((item) => {
    return analyticsService.trackEventSafe({
      userId: buyerId,
      sellerId: item.sellerId,
      storeId: item.storeId,
      productId: item.productId,
      eventType: 'order_placed',
      metadata: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        quantity: item.quantity,
        itemTotal: item.itemTotal,
        paymentMethod
      }
    });
  }));
  await Promise.all(items.map((item) => analyticsService.trackEventSafe({
    userId: buyerId,
    sellerId: item.sellerId,
    storeId: item.storeId,
    productId: item.productId,
    eventType: 'order_awaiting_seller_acceptance',
    metadata: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      quantity: item.quantity,
      itemTotal: item.itemTotal
    }
  })));
  await sendOrderEmails(order);

  return buildOrderConfirmation(order);
};

const placeCodOrder = async (buyerId, addressInput, paymentMethod) => {
  if (!env.enableCodCheckout) {
    throw new AppError('Cash on Delivery is currently unavailable', 400);
  }

  if (paymentMethod !== COD_PAYMENT_METHOD) {
    throw new AppError('paymentMethod must be COD for this endpoint', 400);
  }

  let orders = [];
  let items = [];
  const buyer = await User.findById(buyerId).select('email').lean();
  const delivery = await addressService.resolveDeliveryAddressForOrder(buyerId, addressInput);
  if (!delivery.shippingInfo.email) {
    delivery.shippingInfo.email = buyer?.email || 'buyer@notwhat.in';
    delivery.snapshot.email = delivery.shippingInfo.email;
  }

  await runMaybeTransaction(async (session) => {
    const cart = await getCheckoutCart(buyerId, { session });
    const checkoutItems = await validateCartForCheckout(cart, { session });

    // One order per store so each seller fulfils and is paid independently.
    const groupedByStore = new Map();
    for (const checkoutItem of checkoutItems) {
      const storeKey = storeKeyOf(checkoutItem.product);
      if (!groupedByStore.has(storeKey)) {
        groupedByStore.set(storeKey, []);
      }
      groupedByStore.get(storeKey).push(checkoutItem);
    }

    const storeGroups = [...groupedByStore.values()];
    const groupSubtotals = storeGroups.map((group) => roundMoney(
      group.reduce((total, item) => total + (item.itemTotal || 0), 0)
    ));
    const groupShipping = splitShippingAcrossGroups(groupSubtotals, cart.shipping);
    const sellerAcceptanceExpiresAt = getSellerAcceptanceExpiresAt();

    for (let index = 0; index < storeGroups.length; index += 1) {
      const groupItems = storeGroups[index];
      const orderNumber = generateOrderNumber();
      const orderItems = applyPendingAcceptanceDefaults(
        await financeService.applyFinancialsToOrderItems(groupItems.map((item) => ({
          productId: item.product._id,
          sellerId: item.product.sellerId,
          storeId: item.product.storeId,
          titleSnapshot: item.product.title,
          imageSnapshot: Array.isArray(item.product.imageUrls) && item.product.imageUrls.length > 0
            ? item.product.imageUrls[0]
            : '',
          quantity: item.quantity,
          priceSnapshot: item.priceSnapshot,
          itemTotal: item.itemTotal
        })))
      );
      const sellerIds = [...new Set(orderItems.map((item) => item.sellerId.toString()))];
      const orderSubtotal = groupSubtotals[index];
      const orderShipping = groupShipping[index];
      const orderFinalTotal = roundMoney(orderSubtotal + orderShipping);
      const financialTotals = financeService.summarizeOrderFinancials(orderItems, orderShipping);
      const commission = calculateCommission(orderSubtotal);
      const gstAmount = extractGSTFromInclusivePrice(orderFinalTotal);

      const [createdOrder] = await Order.create([{
        buyerId,
        orderNumber,
        sellerIds,
        items: orderItems,
        shippingInfo: delivery.shippingInfo,
        shippingAddressSnapshot: delivery.snapshot,
        paymentMethod: COD_PAYMENT_METHOD,
        paymentCaptureMode: 'automatic',
        paymentStatus: 'pending',
        orderStatus: 'awaiting_seller_acceptance',
        trackingStatus: 'Waiting for seller confirmation',
        sellerAcceptance: {
          status: 'pending',
          expiresAt: sellerAcceptanceExpiresAt
        },
        paymentFlow: {
          captureAfterSellerAcceptance: false,
          signatureVerified: false
        },
        razorpay: {
          signatureVerified: false
        },
        inventoryConfirmation: {
          confirmedAvailable: false
        },
        inventoryReservation: {
          reservationIds: [],
          expiresAt: sellerAcceptanceExpiresAt,
          status: 'active'
        },
        subtotal: orderSubtotal,
        shipping: orderShipping,
        finalTotal: orderFinalTotal,
        commissionRate: PLATFORM_COMMISSION_RATE,
        commissionAmount: financialTotals.totalPlatformCommission || commission.commissionAmount,
        sellerPayoutAmount: financialTotals.totalSellerEarnings || commission.sellerPayoutAmount,
        ...financialTotals,
        payoutStatus: 'pending',
        gstAmount,
        gstRate: GST_RATE,
        emailSent: false
      }], { session });

      await syncBargainBidsForOrder({
        cart,
        buyerId,
        order: createdOrder,
        session,
        productIds: new Set(groupItems.map((item) => item.product._id.toString()))
      });

      orders.push(createdOrder);
      items.push(...orderItems);
    }

    await cartService.clearCart(buyerId, { session });
  });

  const order = orders[0];

  for (const placedOrder of orders) {
    await Promise.all(placedOrder.items.map((item) => analyticsService.trackEventSafe({
      userId: buyerId,
      sellerId: item.sellerId,
      storeId: item.storeId,
      productId: item.productId,
      eventType: 'order_placed',
      metadata: {
        orderId: placedOrder._id,
        orderNumber: placedOrder.orderNumber,
        quantity: item.quantity,
        itemTotal: item.itemTotal,
        paymentMethod: COD_PAYMENT_METHOD
      }
    })));
    await Promise.all(placedOrder.items.map((item) => analyticsService.trackEventSafe({
      userId: buyerId,
      sellerId: item.sellerId,
      storeId: item.storeId,
      productId: item.productId,
      eventType: 'order_awaiting_seller_acceptance',
      metadata: {
        orderId: placedOrder._id,
        orderNumber: placedOrder.orderNumber,
        quantity: item.quantity,
        itemTotal: item.itemTotal
      }
    })));
    await sendOrderEmails(placedOrder);
  }

  return {
    ...buildOrderConfirmation(order),
    orders: orders.map(buildOrderConfirmation)
  };
};

module.exports = {
  startCheckout,
  verifyAndPlaceOrder,
  placeCodOrder
};
