const Order = require('../orders/order.model');
const SellerProfile = require('../sellers/sellerProfile.model');
const PendingManualPayout = require('./pendingManualPayout.model');
const { initiateRouteTransfer, verifyWebhookSignature } = require('../../utils/razorpay');
const env = require('../../config/env');
const financeService = require('../finance/finance.service');

const DAY_MS = 24 * 60 * 60 * 1000;

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const paiseToRupees = (value) => roundMoney((Number(value) || 0) / 100);

const allocateAmount = (items, amount, getWeight) => {
  const roundedAmount = roundMoney(amount);
  const totalWeight = items.reduce((total, item) => total + Math.max(Number(getWeight(item)) || 0, 0), 0);
  let allocated = 0;

  return items.map((item, index) => {
    if (roundedAmount <= 0 || totalWeight <= 0) {
      return 0;
    }

    if (index === items.length - 1) {
      return roundMoney(roundedAmount - allocated);
    }

    const share = roundMoney(roundedAmount * (Math.max(Number(getWeight(item)) || 0, 0) / totalWeight));
    allocated = roundMoney(allocated + share);
    return share;
  });
};

const splitPaymentToSellers = async (order, razorpayPaymentId, payment = {}) => {
  if (order.razorpayTransfers && order.razorpayTransfers.length > 0) {
    return;
  }

  const razorpayFees = paiseToRupees(payment.fee);
  const razorpayTax = paiseToRupees(payment.tax);
  const itemFeeAllocations = allocateAmount(order.items || [], razorpayFees, (item) => item.itemTotal || item.itemSubtotal || 0);

  order.paymentFlow = order.paymentFlow || {};
  order.paymentFlow.razorpayFees = razorpayFees;
  order.paymentFlow.razorpayTax = razorpayTax;

  order.items.forEach((item, index) => {
    const feeShare = itemFeeAllocations[index] || 0;
    const grossSellerEarnings = item.sellerEarningsAmount || item.sellerPayoutAmount || 0;
    const netSellerEarnings = roundMoney(Math.max(grossSellerEarnings - feeShare, 0));

    item.paymentFeeAmount = feeShare;
    item.sellerEarningsAmount = netSellerEarnings;
    item.sellerPayoutAmount = netSellerEarnings;
  });

  order.totalSellerEarnings = roundMoney(order.items.reduce((total, item) => total + (item.sellerEarningsAmount || 0), 0));
  order.sellerPayoutAmount = order.totalSellerEarnings;

  const sellerMap = {};

  for (const item of order.items) {
    const sellerId = item.sellerId.toString();

    if (!sellerMap[sellerId]) {
      sellerMap[sellerId] = {
        sellerId,
        itemTotal: 0
      };
    }

    sellerMap[sellerId].itemTotal += item.itemTotal || 0;
  }

  const transfers = [];
  const itemPayoutsBySeller = {};

  for (const [sellerId, data] of Object.entries(sellerMap)) {
    const profile = await SellerProfile.findOne({ userId: sellerId });
    const sellerShare = roundMoney(
      order.items
        .filter((item) => item.sellerId.toString() === sellerId)
        .reduce((total, item) => total + (item.sellerEarningsAmount || item.sellerPayoutAmount || 0), 0)
    );

    if (!profile || !profile.razorpayLinkedAccountId) {
      console.warn(`Seller ${sellerId} has no Razorpay linked account - skipping auto transfer`);
      await PendingManualPayout.findOneAndUpdate(
        {
          orderId: order._id,
          sellerId,
          status: 'pending'
        },
        {
          amount: sellerShare,
          reason: 'Seller has no Razorpay linked account'
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );
      itemPayoutsBySeller[sellerId] = {
        amount: sellerShare,
        status: 'pending'
      };
      continue;
    }

    const onHoldUntil = new Date(order.createdAt.getTime() + 14 * DAY_MS);

    transfers.push({
      sellerId,
      linkedAccountId: profile.razorpayLinkedAccountId,
      amount: sellerShare,
      onHoldUntil
    });
    itemPayoutsBySeller[sellerId] = {
      amount: sellerShare,
      status: 'route_transfer_initiated'
    };
  }

  order.items.forEach((item) => {
    const payout = itemPayoutsBySeller[item.sellerId.toString()];

    if (!payout) {
      return;
    }

    const itemShareRatio = sellerMap[item.sellerId.toString()].itemTotal > 0
      ? (item.itemTotal || 0) / sellerMap[item.sellerId.toString()].itemTotal
      : 0;

    item.sellerPayoutAmount = roundMoney(payout.amount * itemShareRatio);
    item.sellerPayoutStatus = payout.status;
  });

  if (transfers.length > 0) {
    const transferResponse = await initiateRouteTransfer(razorpayPaymentId, transfers);
    const transferItems = Array.isArray(transferResponse.items) ? transferResponse.items : [];
    const razorpayTransfers = [];

    transferItems.forEach((transfer, index) => {
      const sellerId = transfers[index] && transfers[index].sellerId;

      if (!sellerId || !transfer.id) {
        return;
      }

      razorpayTransfers.push({
        sellerId,
        transferId: transfer.id,
        amount: transfers[index].amount,
        status: 'on_hold'
      });

      order.items.forEach((item) => {
        if (item.sellerId.toString() === sellerId) {
          item.razorpayTransferId = transfer.id;
        }
      });
    });

    order.razorpayTransfers = razorpayTransfers;
    order.payoutStatus = 'route_transfer_initiated';
  }

  await order.save();
  await financeService.createEarningsForOrder(order);
};

const getAuthorizationExpiresAt = () => {
  const minutes = Number.isFinite(env.razorpayAuthorizationTimeoutMinutes)
    ? env.razorpayAuthorizationTimeoutMinutes
    : 240;

  return new Date(Date.now() + minutes * 60 * 1000);
};

const applyPaymentBasics = (order, payment) => {
  order.razorpayPaymentId = payment.id || order.razorpayPaymentId;
  order.paymentFlow = order.paymentFlow || {};
  order.razorpay = order.razorpay || {};
  order.paymentFlow.razorpayPaymentId = order.razorpayPaymentId;
  order.paymentFlow.razorpayOrderId = payment.order_id || order.paymentFlow.razorpayOrderId;
  order.razorpay.paymentId = order.razorpayPaymentId;
  order.razorpay.orderId = payment.order_id || order.razorpay.orderId;
};

const handlePaymentAuthorized = async (payment) => {
  if (!payment || !payment.order_id) {
    return;
  }

  const order = await Order.findOne({ razorpayOrderId: payment.order_id });

  if (!order || ['paid', 'refunded', 'refund_pending', 'partially_refunded'].includes(order.paymentStatus)) {
    return;
  }

  const now = new Date();
  const authorizationExpiresAt = order.paymentFlow?.authorizationExpiresAt || getAuthorizationExpiresAt();

  applyPaymentBasics(order, payment);
  order.paymentCaptureMode = 'manual';
  order.paymentStatus = 'authorized';
  order.paymentFlow.authorizedAt = order.paymentFlow.authorizedAt || now;
  order.paymentFlow.authorizationExpiresAt = authorizationExpiresAt;
  order.razorpay.authorizedAt = order.razorpay.authorizedAt || now;
  order.razorpay.authorizationExpiresAt = authorizationExpiresAt;

  if (['created', 'pending', 'payment_pending', 'payment_authorization_pending'].includes(order.orderStatus)) {
    order.orderStatus = 'awaiting_seller_acceptance';
  }

  await order.save();
};

const handlePaymentCaptured = async (payment) => {
  if (!payment || !payment.order_id) {
    return;
  }

  const update = {
    paymentStatus: 'paid'
  };

  const order = await Order.findOne({ razorpayOrderId: payment.order_id });

  if (!order) {
    return;
  }

  if (order.orderStatus === 'pending') {
    update.orderStatus = 'placed';
  }

  order.paymentStatus = update.paymentStatus;
  applyPaymentBasics(order, payment);
  order.paymentFlow.capturedAt = order.paymentFlow.capturedAt || new Date();
  order.paymentFlow.captureAmount = payment.amount || order.paymentFlow.captureAmount || 0;
  order.paymentFlow.captureResponseSafeSummary = {
    id: payment.id || '',
    orderId: payment.order_id || '',
    status: payment.status || 'captured',
    amount: payment.amount || 0,
    currency: payment.currency || 'INR',
    fee: payment.fee || 0,
    tax: payment.tax || 0,
    method: payment.method || ''
  };
  order.paymentFlow.captureFailureReason = '';
  order.razorpay.capturedAt = order.razorpay.capturedAt || order.paymentFlow.capturedAt;
  order.razorpay.captureAmount = payment.amount || order.razorpay.captureAmount || 0;
  order.razorpay.captureResponseSafeSummary = order.paymentFlow.captureResponseSafeSummary;
  order.razorpay.captureFailureReason = '';

  if (update.orderStatus) {
    order.orderStatus = update.orderStatus;
  }

  await order.save();

  if (order.orderStatus === 'awaiting_seller_acceptance') {
    return;
  }

  try {
    await splitPaymentToSellers(order, payment.id, payment);
  } catch (error) {
    console.error(`Failed to initiate Razorpay Route transfer for order ${order._id}:`, error.message);
    await Order.findByIdAndUpdate(order._id, { payoutStatus: 'route_transfer_failed' });
  }
};

const handlePaymentFailed = async (payment) => {
  if (!payment || !payment.order_id) {
    return;
  }

  await Order.findOneAndUpdate(
    { razorpayOrderId: payment.order_id },
    {
      paymentStatus: 'failed',
      razorpayPaymentId: payment.id || ''
    }
  );
};

const handleAuthorizedPaymentExpiredOrAutoRefunded = async (payment) => {
  if (!payment || !payment.order_id) {
    return;
  }

  const order = await Order.findOne({ razorpayOrderId: payment.order_id });

  if (!order || order.paymentStatus === 'paid') {
    return;
  }

  applyPaymentBasics(order, payment);
  order.paymentStatus = payment.status === 'refunded' ? 'authorization_expired' : 'auto_refund_pending';
  order.orderStatus = order.orderStatus === 'awaiting_seller_acceptance'
    ? 'acceptance_expired'
    : order.orderStatus;
  order.sellerAcceptance = order.sellerAcceptance || {};
  if (order.sellerAcceptance.status === 'pending') {
    order.sellerAcceptance.status = 'expired';
  }
  order.inventoryReservation = order.inventoryReservation || {};
  order.inventoryReservation.status = 'expired';
  await order.save();
};

const handleRazorpayWebhook = async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  const rawBody = req.body;

  const isProduction = env.nodeEnv === 'production';
  const signatureValid = Buffer.isBuffer(rawBody) && verifyWebhookSignature(rawBody, signature);

  if (isProduction && !signatureValid) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (!isProduction && !signatureValid) {
    console.warn('Webhook signature verification skipped in non-production mode');
  }

  let event;

  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (_error) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const payment = event.payload && event.payload.payment && event.payload.payment.entity;
  const razorpayOrder = event.payload && event.payload.order && event.payload.order.entity;

  try {
    if (event.event === 'payment.authorized') {
      await handlePaymentAuthorized(payment);
    } else if (event.event === 'payment.captured') {
      await handlePaymentCaptured(payment);
    } else if (event.event === 'payment.failed') {
      await handlePaymentFailed(payment);
    } else if (['payment.refunded', 'refund.processed'].includes(event.event)) {
      await handleAuthorizedPaymentExpiredOrAutoRefunded(payment);
    } else if (event.event === 'order.paid') {
      console.log(`Razorpay order paid: ${razorpayOrder && razorpayOrder.id ? razorpayOrder.id : 'unknown'}`);
    }
  } catch (error) {
    console.error(`Webhook handler error for event ${event.event}:`, error.message);
  }

  return res.status(200).json({ received: true });
};

module.exports = {
  handleRazorpayWebhook,
  splitPaymentToSellers,
  handlePaymentAuthorized,
  handlePaymentCaptured,
  handlePaymentFailed,
  handleAuthorizedPaymentExpiredOrAutoRefunded
};
