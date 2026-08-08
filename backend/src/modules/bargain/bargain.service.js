const AppError = require('../../utils/AppError');
const env = require('../../config/env');
const {
  createManualCaptureOrder,
  fetchPayment,
  safeCaptureBidPaymentOnce
} = require('../../utils/razorpay');
const { sendEmailSafe } = require('../../utils/email');
const {
  buildBidLostEmail,
  buildBidWonEmail,
  buildNewOrderAlertEmail,
  buildOrderConfirmationEmail
} = require('../../utils/emailTemplates');
const { PLATFORM_COMMISSION_RATE, GST_RATE, extractGSTFromInclusivePrice } = require('../../config/commissionConfig');
const financeService = require('../finance/finance.service');
const Order = require('../orders/order.model');
const Product = require('../products/product.model');
const User = require('../users/user.model');
const Bid = require('./bid.model');
const BargainSchedule = require('./bargainSchedule.model');
const { splitPaymentToSellers } = require('../checkout/webhook.controller');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MIN_BARGAIN_DAYS = 1;
const MAX_BARGAIN_DAYS = 2;

const getBidAuthorizationExpiresAt = () => {
  const minutes = Number.isFinite(env.bidAcceptanceWindowMinutes)
    ? env.bidAcceptanceWindowMinutes
    : 240;

  return new Date(Date.now() + minutes * 60 * 1000);
};

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `NW-BID-${timestamp}-${random}`;
};

const cleanShippingInfo = (shippingInfo = {}) => ({
  name: (shippingInfo.name || '').trim(),
  email: (shippingInfo.email || '').trim().toLowerCase(),
  phone: (shippingInfo.phone || '').trim(),
  address: (shippingInfo.address || '').trim(),
  city: (shippingInfo.city || '').trim(),
  state: (shippingInfo.state || '').trim(),
  postalCode: (shippingInfo.postalCode || '').trim()
});

const shippingInfoIsComplete = (shippingInfo = {}) => {
  const cleaned = cleanShippingInfo(shippingInfo);

  return Boolean(
    cleaned.name
    && cleaned.email
    && cleaned.phone
    && cleaned.address
    && cleaned.city
    && cleaned.state
    && cleaned.postalCode
  );
};

const paymentMethodFromRazorpay = (payment = {}) => {
  const method = String(payment.method || '').toLowerCase();

  if (['card', 'netbanking', 'wallet'].includes(method)) {
    return method;
  }

  return 'UPI';
};

const buildCaptureSummary = (payment = {}, fallback = {}) => ({
  id: payment.id || fallback.paymentId || '',
  orderId: payment.order_id || fallback.orderId || '',
  status: payment.status || fallback.status || '',
  amount: payment.amount || fallback.amount || 0,
  currency: payment.currency || 'INR',
  fee: payment.fee || 0,
  tax: payment.tax || 0,
  method: payment.method || ''
});

const getExpectedPaymentAmount = (order, winningBid) => Math.round(
  roundMoney(order.finalTotal || winningBid.amount || 0) * 100
);

const validateCapturedAmountMatchesOrder = ({ order, winningBid, capturePayment }) => {
  const expectedAmount = getExpectedPaymentAmount(order, winningBid);
  const capturedAmount = Number(capturePayment?.amount);

  if (!Number.isFinite(capturedAmount)) {
    throw new AppError('Unable to verify captured payment amount against order total', 409);
  }

  if (Math.round(capturedAmount) !== expectedAmount) {
    throw new AppError(
      `Captured payment amount mismatch: expected ${expectedAmount} paise but received ${Math.round(capturedAmount)} paise`,
      409
    );
  }

  return expectedAmount;
};

const activeProductPopulate = {
  path: 'productId',
  select: 'sellerId storeId title description productLink category region price stock tags imageUrls featured status saveCount clickCount createdAt',
  populate: {
    path: 'storeId',
    select: 'storeName profileImageUrl verified city state region category'
  }
};

const scheduleIsCurrentlyOpen = (schedule, now = new Date()) => {
  return schedule
    && schedule.status === 'active'
    && schedule.startDate <= now
    && schedule.endDate >= now;
};

const assertValidScheduleWindow = (startDate, endDate) => {
  if (endDate <= startDate) {
    throw new AppError('endDate must be after startDate', 400);
  }

  const durationDays = (endDate.getTime() - startDate.getTime()) / ONE_DAY_MS;

  if (durationDays < MIN_BARGAIN_DAYS || durationDays > MAX_BARGAIN_DAYS) {
    throw new AppError('Bargain schedule must last 1 or 2 days', 400);
  }
};

const getSellerProduct = async (productId, sellerId) => {
  const product = await Product.findOne({
    _id: productId,
    sellerId
  });

  if (!product) {
    throw new AppError('Product not found for this seller', 404);
  }

  return product;
};

const getActiveScheduleForProduct = async (productId) => {
  return BargainSchedule.findOne({
    productId,
    status: 'active'
  });
};

const sendBargainResultEmails = async (winningBid, losingBids, product) => {
  const buyerIds = [
    winningBid.buyerId,
    ...losingBids.map((bid) => bid.buyerId)
  ];
  const buyers = await User.find({ _id: { $in: buyerIds } }).select('email').lean();
  const buyerEmailById = new Map(buyers.map((buyer) => [buyer._id.toString(), buyer.email]));
  const emails = [];
  const winnerEmail = buyerEmailById.get(winningBid.buyerId.toString());

  if (winnerEmail) {
    emails.push(buildBidWonEmail(winningBid, product, winnerEmail));
  }

  losingBids.forEach((bid) => {
    const buyerEmail = buyerEmailById.get(bid.buyerId.toString());

    if (buyerEmail) {
      emails.push(buildBidLostEmail(bid, product, buyerEmail));
    }
  });

  await Promise.all(emails.map((email) => sendEmailSafe(email)));
};

const sendWinningBidOrderEmails = async (order) => {
  const sellerIds = [...new Set(order.items.map((item) => item.sellerId.toString()))];
  const sellers = await User.find({ _id: { $in: sellerIds } }).select('email').lean();
  const sellerEmailById = new Map(sellers.map((seller) => [seller._id.toString(), seller.email]));
  const emails = [buildOrderConfirmationEmail(order)];

  sellerIds.forEach((sellerId) => {
    const sellerEmail = sellerEmailById.get(sellerId);

    if (!sellerEmail) {
      return;
    }

    const sellerItems = order.items.filter((item) => item.sellerId.toString() === sellerId);
    const sellerSubtotal = sellerItems.reduce((total, item) => total + (item.itemTotal || 0), 0);

    emails.push(buildNewOrderAlertEmail(
      order,
      sellerEmail,
      sellerItems,
      sellerSubtotal,
      order.commissionRate || PLATFORM_COMMISSION_RATE
    ));
  });

  const results = await Promise.all(emails.map((email) => sendEmailSafe(email)));

  if (results.every(Boolean)) {
    order.emailSent = true;
    await order.save();
  }
};

const scheduleBargain = async (seller, productId, { startDate, endDate, reservePrice = 0 }) => {
  const product = await getSellerProduct(productId, seller.id);

  if (product.status !== 'active' || product.stock <= 0) {
    throw new AppError('Only active in-stock products can be scheduled for Bargain Days', 400);
  }

  assertValidScheduleWindow(startDate, endDate);

  const existingActiveSchedule = await getActiveScheduleForProduct(product._id);

  if (existingActiveSchedule) {
    throw new AppError('This product already has an active bargain schedule', 409);
  }

  return BargainSchedule.create({
    productId: product._id,
    sellerId: seller.id,
    startDate,
    endDate,
    reservePrice,
    status: 'active',
    winningBidId: null
  });
};

const createBidOrder = async (buyer, productId, { amount, quantity = 1 }) => {
  const product = await Product.findById(productId);

  if (!product || product.status !== 'active' || product.stock <= 0) {
    throw new AppError('Product is not available for bidding', 400);
  }

  if (amount >= product.price) {
    throw new AppError('Bid price per item must be lower than the marked price', 400);
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400);
  }

  if (quantity > product.stock) {
    throw new AppError('Quantity cannot exceed available product stock', 400);
  }

  const schedule = await getActiveScheduleForProduct(product._id);

  if (!scheduleIsCurrentlyOpen(schedule)) {
    throw new AppError('Bargain schedule is not currently active', 400);
  }

  let razorpayOrderId;
  let razorpayOrderAmount = Math.round(amount * quantity * 100);

  if (env.razorpayKeyId && env.razorpayKeySecret) {
    const razorpayOrder = await createManualCaptureOrder({
      amount: razorpayOrderAmount,
      currency: 'INR',
      receipt: `bid_${buyer.id.toString().slice(-8)}_${Date.now().toString(36)}`,
      notes: { buyerId: buyer.id.toString(), productId: product._id.toString() }
    });
    razorpayOrderId = razorpayOrder.id;
    razorpayOrderAmount = razorpayOrder.amount;
  } else {
    razorpayOrderId = `mock_bid_order_${Date.now()}`;
  }

  return {
    razorpayKeyId: env.razorpayKeyId || '',
    razorpayOrderId,
    razorpayOrderAmount
  };
};

const placeBid = async (buyer, productId, { amount, quantity = 1, razorpayPaymentId, shippingInfo }) => {
  const product = await Product.findById(productId);

  if (!product || product.status !== 'active' || product.stock <= 0) {
    throw new AppError('Product is not available for bidding', 400);
  }

  if (amount >= product.price) {
    throw new AppError('Bid price per item must be lower than the marked price', 400);
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400);
  }

  if (quantity > product.stock) {
    throw new AppError('Quantity cannot exceed available product stock', 400);
  }

  const schedule = await getActiveScheduleForProduct(product._id);

  if (!scheduleIsCurrentlyOpen(schedule)) {
    throw new AppError('Bargain schedule is not currently active', 400);
  }

  const cleanedShippingInfo = cleanShippingInfo(shippingInfo);

  if (!shippingInfoIsComplete(cleanedShippingInfo)) {
    throw new AppError('Complete shipping details before placing the bid', 400);
  }

  const existingBid = await Bid.findOne({
    productId: product._id,
    buyerId: buyer.id,
    bidStatus: { $in: ['active', 'pending_seller_decision'] }
  });

  if (existingBid && existingBid.amount === amount) {
    throw new AppError('You already have an active bid at this amount. Enter a different amount to update your bid.', 400);
  }

  let verifiedPaymentId = razorpayPaymentId;
  let verifiedPayment = null;

  if (!verifiedPaymentId && env.nodeEnv !== 'production') {
    verifiedPaymentId = `dev_bid_payment_${Date.now()}`;
  } else {
    const payment = await fetchPayment(verifiedPaymentId);

    if (!payment || payment.status !== 'authorized') {
      throw new AppError('Payment not authorized', 400);
    }

    if (payment.amount !== Math.round(amount * quantity * 100)) {
      throw new AppError('Payment amount mismatch', 400);
    }

    verifiedPayment = payment;
  }

  // Buyers can revise their bid by placing another bid; the active bid is updated in place.
  if (existingBid) {
    existingBid.amount = amount;
    existingBid.quantity = quantity;
    existingBid.shippingInfo = cleanedShippingInfo;
    existingBid.razorpayPaymentId = verifiedPaymentId;
    existingBid.razorpayOrderId = verifiedPayment?.order_id || existingBid.razorpayOrderId;
    existingBid.paymentStatus = 'authorized';
    existingBid.bidStatus = 'pending_seller_decision';
    existingBid.razorpay = {
      ...(existingBid.razorpay || {}),
      orderId: verifiedPayment?.order_id || existingBid.razorpay?.orderId || '',
      paymentId: verifiedPaymentId,
      authorizedAt: new Date(),
      authorizationExpiresAt: getBidAuthorizationExpiresAt(),
      captureFailureReason: ''
    };
    await existingBid.save();

    return existingBid;
  }

  return Bid.create({
    productId: product._id,
    buyerId: buyer.id,
    sellerId: product.sellerId,
    amount,
    quantity,
    shippingInfo: cleanedShippingInfo,
    razorpayOrderId: verifiedPayment?.order_id || '',
    razorpayPaymentId: verifiedPaymentId,
    paymentStatus: 'authorized',
    bidStatus: 'pending_seller_decision',
    razorpay: {
      orderId: verifiedPayment?.order_id || '',
      paymentId: verifiedPaymentId,
      authorizedAt: new Date(),
      authorizationExpiresAt: getBidAuthorizationExpiresAt()
    }
  });
};

const releaseBidAuthorizations = async (bids, status = 'lost') => {
  await Promise.all(bids.map(async (bid) => {
    bid.bidStatus = status;
    bid.sellerDecision = {
      ...(bid.sellerDecision || {}),
      decidedAt: new Date(),
      decision: 'rejected',
      rejectionReason: status === 'expired' ? 'Bargain expired' : 'Bid was not selected'
    };
    await bid.save();
  }));
};

const createOrderFromWinningBid = async ({ winningBid, product, schedule }) => {
  if (winningBid.orderId) {
    const existingOrder = await Order.findById(winningBid.orderId);

    if (existingOrder) {
      return existingOrder;
    }
  }

  if (!shippingInfoIsComplete(winningBid.shippingInfo)) {
    throw new AppError('Winning bid is missing shipping info. Ask the buyer to place the bid again.', 409);
  }

  const bidAmount = roundMoney(winningBid.amount);
  const bidQuantity = Math.max(1, Number(winningBid.quantity) || 1);
  const itemTotal = roundMoney(bidAmount * bidQuantity);
  const shipping = 0;
  const finalTotal = itemTotal + shipping;
  const orderNumber = generateOrderNumber();
  const [financialItem] = await financeService.applyFinancialsToOrderItems([{
    productId: product._id,
    sellerId: product.sellerId,
    storeId: product.storeId,
    titleSnapshot: product.title,
    imageSnapshot: Array.isArray(product.imageUrls) && product.imageUrls.length > 0
      ? product.imageUrls[0]
      : '',
    quantity: bidQuantity,
    priceSnapshot: bidAmount,
    itemTotal,
    itemStatus: 'processing',
    itemAcceptanceStatus: 'accepted'
  }]);
  const financialTotals = financeService.summarizeOrderFinancials([financialItem], shipping);
  const now = new Date();

  const order = await Order.create({
    buyerId: winningBid.buyerId,
    orderNumber,
    sellerIds: [product.sellerId],
    items: [financialItem],
    shippingInfo: cleanShippingInfo(winningBid.shippingInfo),
    paymentMethod: paymentMethodFromRazorpay(),
    paymentCaptureMode: 'manual',
    razorpayOrderId: winningBid.razorpayOrderId || winningBid.razorpay?.orderId || '',
    razorpayPaymentId: winningBid.razorpayPaymentId || winningBid.razorpay?.paymentId || '',
    paymentStatus: 'authorized',
    orderStatus: 'processing',
    trackingStatus: 'Winning bid accepted. Payment capture pending.',
    sellerAcceptance: {
      status: 'accepted',
      acceptedBy: product.sellerId,
      acceptedAt: now
    },
    paymentFlow: {
      captureAfterSellerAcceptance: true,
      razorpayOrderId: winningBid.razorpayOrderId || winningBid.razorpay?.orderId || '',
      razorpayPaymentId: winningBid.razorpayPaymentId || winningBid.razorpay?.paymentId || '',
      signatureVerified: Boolean(winningBid.razorpay?.signatureVerified),
      authorizedAt: winningBid.razorpay?.authorizedAt || null,
      authorizationExpiresAt: winningBid.razorpay?.authorizationExpiresAt || null
    },
    razorpay: {
      orderId: winningBid.razorpayOrderId || winningBid.razorpay?.orderId || '',
      paymentId: winningBid.razorpayPaymentId || winningBid.razorpay?.paymentId || '',
      signatureVerified: Boolean(winningBid.razorpay?.signatureVerified),
      authorizedAt: winningBid.razorpay?.authorizedAt || null,
      authorizationExpiresAt: winningBid.razorpay?.authorizationExpiresAt || null
    },
    inventoryConfirmation: {
      confirmedAvailable: true,
      confirmedAt: now
    },
    inventoryReservation: {
      reservationIds: [],
      expiresAt: schedule.endDate,
      status: 'confirmed'
    },
    subtotal: itemTotal,
    shipping,
    finalTotal,
    commissionRate: PLATFORM_COMMISSION_RATE,
    commissionAmount: financialTotals.totalPlatformCommission,
    sellerPayoutAmount: financialTotals.totalSellerEarnings,
    ...financialTotals,
    payoutStatus: 'pending',
    gstAmount: extractGSTFromInclusivePrice(finalTotal),
    gstRate: GST_RATE,
    emailSent: false
  });

  winningBid.orderId = order._id;
  await winningBid.save();

  return order;
};

const markWinningBidOrderCaptureFailed = async (order, reason) => {
  order.paymentStatus = 'capture_failed';
  order.trackingStatus = 'Winning bid payment capture failed';
  order.paymentFlow = order.paymentFlow || {};
  order.paymentFlow.captureFailureReason = reason;
  order.razorpay = order.razorpay || {};
  order.razorpay.captureFailureReason = reason;
  await order.save();
};

const markWinningBidOrderPaid = async ({ order, winningBid, capturePayment }) => {
  const now = new Date();
  const captureAmount = validateCapturedAmountMatchesOrder({ order, winningBid, capturePayment });
  const summary = buildCaptureSummary(capturePayment, {
    paymentId: winningBid.razorpayPaymentId || winningBid.razorpay?.paymentId || '',
    orderId: winningBid.razorpayOrderId || winningBid.razorpay?.orderId || '',
    status: 'captured',
    amount: captureAmount
  });

  order.paymentMethod = paymentMethodFromRazorpay(capturePayment);
  order.paymentStatus = 'paid';
  order.orderStatus = 'processing';
  order.trackingStatus = 'Order confirmed from winning bid';
  order.razorpayOrderId = winningBid.razorpayOrderId || winningBid.razorpay?.orderId || order.razorpayOrderId || '';
  order.razorpayPaymentId = winningBid.razorpayPaymentId || winningBid.razorpay?.paymentId || order.razorpayPaymentId || '';
  order.paymentFlow = {
    ...(order.paymentFlow || {}),
    captureAfterSellerAcceptance: true,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    signatureVerified: Boolean(winningBid.razorpay?.signatureVerified),
    authorizedAt: winningBid.razorpay?.authorizedAt || order.paymentFlow?.authorizedAt || null,
    capturedAt: order.paymentFlow?.capturedAt || now,
    captureAmount,
    captureResponseSafeSummary: summary,
    captureFailureReason: '',
    authorizationExpiresAt: winningBid.razorpay?.authorizationExpiresAt || order.paymentFlow?.authorizationExpiresAt || null
  };
  order.razorpay = {
    ...(order.razorpay || {}),
    orderId: order.razorpayOrderId,
    paymentId: order.razorpayPaymentId,
    signatureVerified: Boolean(winningBid.razorpay?.signatureVerified),
    authorizedAt: winningBid.razorpay?.authorizedAt || order.razorpay?.authorizedAt || null,
    capturedAt: order.razorpay?.capturedAt || now,
    captureAmount,
    captureResponseSafeSummary: summary,
    captureFailureReason: '',
    authorizationExpiresAt: winningBid.razorpay?.authorizationExpiresAt || order.razorpay?.authorizationExpiresAt || null
  };

  await order.save();

  try {
    await splitPaymentToSellers(order, order.razorpayPaymentId, capturePayment);
  } catch (error) {
    console.error(`Failed to initiate Route transfer for winning bid order ${order._id}:`, error.message);
    order.payoutStatus = 'route_transfer_failed';
    await order.save();
  }

  return order;
};

const getProductBids = async (seller, productId) => {
  await getSellerProduct(productId, seller.id);

  return Bid.find({ productId })
    .populate('buyerId', 'name email phone')
    .sort({ amount: -1, createdAt: 1 })
    .lean();
};

const acceptBid = async (seller, productId, bidId) => {
  const product = await getSellerProduct(productId, seller.id);
  const schedule = await getActiveScheduleForProduct(product._id);

  if (!schedule) {
    throw new AppError('Active bargain schedule not found', 404);
  }

  if (!scheduleIsCurrentlyOpen(schedule)) {
    throw new AppError('Bargain schedule is not currently active', 400);
  }

  const bid = await Bid.findOne({
    _id: bidId,
    productId: product._id,
    sellerId: seller.id
  });

  if (!bid) {
    throw new AppError('Bid not found for this product', 404);
  }

  if (!['active', 'pending_seller_decision'].includes(bid.bidStatus)) {
    throw new AppError('Only active or pending bids can be accepted', 400);
  }

  if (schedule.reservePrice > 0 && bid.amount < schedule.reservePrice) {
    throw new AppError('Cannot accept bid below reserve price', 400);
  }

  const requestedQuantity = Math.max(1, Number(bid.quantity) || 1);
  if (requestedQuantity > product.stock) {
    throw new AppError('Bid quantity exceeds available stock', 409);
  }

  const authorizationExpiresAt = bid.razorpay?.authorizationExpiresAt;
  if (authorizationExpiresAt && new Date(authorizationExpiresAt).getTime() <= Date.now()) {
    throw new AppError('Bid payment authorization has expired', 409);
  }

  const competingBids = await Bid.find({
    productId: product._id,
    _id: { $ne: bid._id },
    bidStatus: { $in: ['active', 'pending_seller_decision'] }
  });

  if (competingBids.length > 0) {
    await releaseBidAuthorizations(competingBids, 'rejected');
  }

  bid.bidStatus = 'accepted';
  bid.sellerDecision = {
    ...(bid.sellerDecision || {}),
    decidedBy: seller.id,
    decidedAt: new Date(),
    decision: 'accepted',
    messageToBuyer: 'Your bid was accepted. Proceed to payment within the allowed window.',
    rejectionReason: ''
  };
  await bid.save();

  schedule.status = 'closed';
  schedule.winningBidId = bid._id;
  await schedule.save();

  return {
    acceptedBid: bid,
    schedule,
    rejectedBidCount: competingBids.length
  };
};

const closeBidPaymentWindow = async (seller, productId, bidId) => {
  const product = await getSellerProduct(productId, seller.id);

  const bid = await Bid.findOne({
    _id: bidId,
    productId: product._id,
    sellerId: seller.id
  });

  if (!bid) {
    throw new AppError('Bid not found for this product', 404);
  }

  if (!['accepted', 'won'].includes(bid.bidStatus)) {
    throw new AppError('Only accepted bids can have their payment window closed', 400);
  }

  if (['captured', 'refunded', 'cancelled'].includes(String(bid.paymentStatus || '').toLowerCase())) {
    throw new AppError('Cannot close payment window for completed payment', 400);
  }

  const now = new Date();
  bid.bidStatus = 'expired';
  bid.paymentStatus = 'authorization_expired';
  bid.sellerDecision = {
    ...(bid.sellerDecision || {}),
    decidedBy: seller.id,
    decidedAt: now,
    decision: 'rejected',
    messageToBuyer: 'Payment window closed by seller.',
    rejectionReason: 'Payment window closed by seller'
  };
  bid.razorpay = {
    ...(bid.razorpay || {}),
    authorizationExpiresAt: now,
    captureFailureReason: 'Payment window closed by seller'
  };
  await bid.save();

  const schedule = await BargainSchedule.findOne({ productId: product._id, winningBidId: bid._id });
  if (schedule) {
    schedule.winningBidId = null;
    if (schedule.endDate > now) {
      schedule.status = 'active';
    }
    await schedule.save();
  }

  return { bid, schedule: schedule || null };
};

const reopenBidNegotiation = async (seller, productId, bidId) => {
  const product = await getSellerProduct(productId, seller.id);

  const bid = await Bid.findOne({
    _id: bidId,
    productId: product._id,
    sellerId: seller.id
  });

  if (!bid) {
    throw new AppError('Bid not found for this product', 404);
  }

  if (!['accepted', 'expired', 'rejected', 'pending_seller_decision'].includes(bid.bidStatus)) {
    throw new AppError('Only accepted, pending, or expired bids can be reopened', 400);
  }

  if (['captured', 'refunded', 'cancelled'].includes(String(bid.paymentStatus || '').toLowerCase())) {
    throw new AppError('Cannot reopen negotiation for completed payment', 400);
  }

  bid.bidStatus = 'pending_seller_decision';
  bid.paymentStatus = 'pending_authorization';
  bid.sellerDecision = {
    ...(bid.sellerDecision || {}),
    decidedBy: seller.id,
    decidedAt: new Date(),
    decision: '',
    messageToBuyer: 'Negotiation reopened by seller. Place an updated bid to continue.',
    rejectionReason: ''
  };
  await bid.save();

  let schedule = await BargainSchedule.findOne({ productId: product._id, status: 'active' });
  if (!schedule) {
    const maybeClosed = await BargainSchedule.findOne({ productId: product._id }).sort({ endDate: -1 });
    if (maybeClosed && maybeClosed.endDate > new Date()) {
      maybeClosed.status = 'active';
      maybeClosed.winningBidId = null;
      await maybeClosed.save();
      schedule = maybeClosed;
    }
  }

  if (schedule && schedule.winningBidId && schedule.winningBidId.toString() === bid._id.toString()) {
    schedule.winningBidId = null;
    await schedule.save();
  }

  return { bid, schedule: schedule || null };
};

const closeBargain = async (seller, productId, { force = false } = {}) => {
  const product = await getSellerProduct(productId, seller.id);
  const schedule = await getActiveScheduleForProduct(product._id);

  if (!schedule) {
    throw new AppError('Active bargain schedule not found', 404);
  }

  const now = new Date();

  if (!force && now < schedule.endDate) {
    throw new AppError(
      `Bargain cannot be closed before its scheduled end date (${schedule.endDate.toISOString()})`,
      400
    );
  }

  const winningBid = await Bid.findOne({
    productId: product._id,
    bidStatus: { $in: ['active', 'pending_seller_decision'] }
  }).sort({ amount: -1, createdAt: 1 });

  if (!winningBid) {
    schedule.status = 'closed';
    schedule.winningBidId = null;
    await schedule.save();

    return {
      schedule,
      winningBid: null,
      message: 'Bargain closed with no bids'
    };
  }

  if (schedule.reservePrice > 0 && winningBid.amount < schedule.reservePrice) {
    const bidsToRelease = await Bid.find({
      productId: product._id,
      bidStatus: { $in: ['active', 'pending_seller_decision'] }
    });
    await releaseBidAuthorizations(bidsToRelease, 'lost');

    schedule.status = 'closed';
    schedule.winningBidId = null;
    await schedule.save();

    return {
      schedule,
      winningBid: null,
      message: 'Bargain closed — reserve price not met'
    };
  }

  if (!shippingInfoIsComplete(winningBid.shippingInfo)) {
    throw new AppError('Winning bid is missing shipping info. Ask the buyer to place the bid again.', 409);
  }

  const order = await createOrderFromWinningBid({
    winningBid,
    product,
    schedule
  });

  const captureResult = await safeCaptureBidPaymentOnce(winningBid);

  if (!captureResult.captured) {
    const reason = captureResult.reason || 'Winning bid payment could not be captured';
    await markWinningBidOrderCaptureFailed(order, reason);
    throw new AppError(reason, 409);
  }

  try {
    validateCapturedAmountMatchesOrder({
      order,
      winningBid,
      capturePayment: captureResult.payment
    });
  } catch (error) {
    await markWinningBidOrderCaptureFailed(order, error.message);
    throw error;
  }

  await markWinningBidOrderPaid({
    order,
    winningBid,
    capturePayment: captureResult.payment
  });

  const losingBids = await Bid.find({
    productId: product._id,
    _id: { $ne: winningBid._id },
    bidStatus: { $in: ['active', 'pending_seller_decision'] }
  });

  await releaseBidAuthorizations(losingBids, 'lost');

  winningBid.bidStatus = 'won';
  winningBid.paymentStatus = 'captured';
  winningBid.sellerDecision = {
    ...(winningBid.sellerDecision || {}),
    decidedBy: seller.id,
    decidedAt: new Date(),
    decision: 'accepted',
    messageToBuyer: 'Your bid was accepted.'
  };

  await Bid.updateMany(
    {
      productId: product._id,
      _id: { $ne: winningBid._id },
      bidStatus: { $in: ['active', 'pending_seller_decision'] }
    },
    {
      $set: {
        bidStatus: 'lost',
        'sellerDecision.decision': 'rejected',
        'sellerDecision.decidedAt': new Date(),
        'sellerDecision.rejectionReason': 'Bid was not selected'
      }
    }
  );

  const soldQuantity = Math.max(1, Number(winningBid.quantity) || 1);
  product.stock = Math.max(product.stock - soldQuantity, 0);

  if (product.stock === 0) {
    product.status = 'sold_out';
  }

  schedule.status = 'closed';
  schedule.winningBidId = winningBid._id;

  await Promise.all([
    winningBid.save(),
    product.save(),
    schedule.save()
  ]);

  await sendWinningBidOrderEmails(order);
  await sendBargainResultEmails(winningBid, losingBids, product);

  return {
    schedule,
    winningBid,
    order,
    product
  };
};

const withdrawBid = async (buyer, bidId) => {
  const bid = await Bid.findOne({
    _id: bidId,
    buyerId: buyer.id
  });

  if (!bid) {
    throw new AppError('Bid not found', 404);
  }

  if (bid.bidStatus !== 'active') {
    throw new AppError('Only active bids can be withdrawn', 400);
  }

  const schedule = await getActiveScheduleForProduct(bid.productId);

  if (!scheduleIsCurrentlyOpen(schedule)) {
    throw new AppError('Cannot withdraw bid after bargain has closed', 400);
  }

  bid.bidStatus = 'withdrawn';
  await bid.save();

  return bid;
};

const getActiveBargains = async () => {
  const now = new Date();
  const activeSchedules = await BargainSchedule.find({
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now }
  })
    .populate(activeProductPopulate)
    .sort({ endDate: 1 })
    .lean();

  return activeSchedules.filter((schedule) => {
    return schedule.productId
      && schedule.productId.status === 'active'
      && schedule.productId.stock > 0;
  });
};

const getBuyerBids = async (buyer) => {
  const now = new Date();
  const buyerBids = await Bid.find({ buyerId: buyer.id })
    .populate(activeProductPopulate)
    .sort({ createdAt: -1 })
    .lean();

  const productIds = [...new Set(
    buyerBids
      .map((bid) => bid.productId?._id || bid.productId)
      .filter(Boolean)
      .map((value) => value.toString())
  )];

  const schedules = await BargainSchedule.find({ productId: { $in: productIds } })
    .sort({ endDate: -1 })
    .lean();

  const latestScheduleByProductId = new Map();
  schedules.forEach((schedule) => {
    const key = schedule.productId?.toString();
    if (key && !latestScheduleByProductId.has(key)) {
      latestScheduleByProductId.set(key, schedule);
    }
  });

  return buyerBids.map((bid) => {
    const product = bid.productId && bid.productId._id ? bid.productId : null;
    const productId = product?._id?.toString() || bid.productId?.toString() || '';
    const schedule = latestScheduleByProductId.get(productId);
    const paymentWindowEndsAt = bid.razorpay?.authorizationExpiresAt || null;
    const canProceedToPayment =
      ['accepted', 'won'].includes(bid.bidStatus)
      && !['captured', 'refunded', 'cancelled'].includes(String(bid.paymentStatus || '').toLowerCase())
      && (!paymentWindowEndsAt || new Date(paymentWindowEndsAt) > now);

    return {
      ...bid,
      product,
      scheduleEndDate: schedule?.endDate || null,
      scheduleStatus: schedule?.status || null,
      paymentWindowEndsAt,
      canProceedToPayment
    };
  });
};

module.exports = {
  scheduleBargain,
  createBidOrder,
  placeBid,
  getBuyerBids,
  getProductBids,
  acceptBid,
  closeBidPaymentWindow,
  reopenBidNegotiation,
  closeBargain,
  withdrawBid,
  getActiveBargains
};
