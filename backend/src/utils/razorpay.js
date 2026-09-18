const crypto = require('crypto');
const Razorpay = require('razorpay');

const env = require('../config/env');

const throwMissingRazorpayConfig = async () => {
  throw new Error('Razorpay credentials are not configured');
};

const razorpay = env.razorpayKeyId && env.razorpayKeySecret
  ? new Razorpay({
    key_id: env.razorpayKeyId,
    key_secret: env.razorpayKeySecret
  })
  : {
    orders: { create: throwMissingRazorpayConfig },
    payments: {
      fetch: throwMissingRazorpayConfig,
      capture: throwMissingRazorpayConfig,
      refund: throwMissingRazorpayConfig,
      transfer: throwMissingRazorpayConfig
    },
    accounts: { create: throwMissingRazorpayConfig },
    stakeholders: { create: throwMissingRazorpayConfig },
    transfers: { edit: throwMissingRazorpayConfig }
  };

const verifyWebhookSignature = (body, signature, secret = env.razorpayWebhookSecret) => {
  if (!body || !signature || !secret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  return expectedBuffer.length === signatureBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
};

const initiateRouteTransfer = async (razorpayPaymentId, transfers) => {
  const transferPayload = {
    transfers: transfers.map((transfer) => ({
      account: transfer.linkedAccountId,
      amount: Math.round(transfer.amount * 100),
      currency: 'INR',
      on_hold: true,
      on_hold_until: Math.floor(transfer.onHoldUntil.getTime() / 1000)
    }))
  };

  return razorpay.payments.transfer(razorpayPaymentId, transferPayload);
};

const createManualCaptureOrder = async ({
  amount,
  currency = 'INR',
  receipt,
  notes = {}
}) => {
  return razorpay.orders.create({
    amount: Math.round(amount),
    currency,
    receipt,
    payment_capture: 0,
    notes
  });
};

const verifyPaymentSignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
}) => verifyWebhookSignature(
  `${razorpayOrderId}|${razorpayPaymentId}`,
  razorpaySignature,
  env.razorpayKeySecret
);

const fetchPayment = async (paymentId) => razorpay.payments.fetch(paymentId);

const createLinkedAccount = async ({ email, legalName, businessType, bankAccount }) => {
  return razorpay.accounts.create({
    email,
    profile: {
      category: 'ecommerce',
      subcategory: 'fashion_and_lifestyle',
      addresses: {
        registered: {
          street1: 'India',
          city: 'India',
          state: 'MH',
          postal_code: '400001',
          country: 'IN'
        }
      }
    },
    legal_business_name: legalName,
    business_type: businessType || 'individual',
    legal_info: {
      pan: bankAccount.panNumber || undefined,
      gst: bankAccount.gstNumber || undefined
    }
  });
};

const addLinkedAccountBankAccount = async (linkedAccountId, { accountNumber, ifscCode, name }) => {
  return razorpay.stakeholders.create(linkedAccountId, {
    name,
    email: '',
    phone: { primary: '' },
    addresses: {},
    kyc: {},
    bank_account: {
      beneficiary_name: name,
      account_number: accountNumber,
      ifsc_code: ifscCode
    }
  });
};

const releaseTransferOnHold = async (transferId) => {
  return razorpay.transfers.edit(transferId, {
    on_hold: false
  });
};

const summarizePaymentResponse = (payment = {}) => ({
  id: payment.id || '',
  orderId: payment.order_id || '',
  status: payment.status || '',
  amount: payment.amount || 0,
  currency: payment.currency || 'INR',
  fee: payment.fee || 0,
  tax: payment.tax || 0,
  method: payment.method || '',
  captured: payment.captured,
  errorCode: payment.error_code || '',
  errorDescription: payment.error_description || ''
});

const capturePayment = async (paymentIdOrOptions, amount, currency = 'INR') => {
  const options = typeof paymentIdOrOptions === 'object'
    ? paymentIdOrOptions
    : { paymentId: paymentIdOrOptions, amount, currency };

  return razorpay.payments.capture(
    options.paymentId,
    Math.round(options.amount),
    options.currency || 'INR'
  );
};

const getDocPaymentId = (doc) => doc.razorpayPaymentId
  || doc.paymentFlow?.razorpayPaymentId
  || doc.razorpay?.paymentId
  || '';

const getDocOrderId = (doc) => doc.razorpayOrderId
  || doc.paymentFlow?.razorpayOrderId
  || doc.razorpay?.orderId
  || '';

const isLocalPaymentId = (paymentId = '') => paymentId.startsWith('dev_') || paymentId.startsWith('mock_');

const applyCapturedPaymentToOrder = (order, payment, amount) => {
  const now = new Date();
  const summary = summarizePaymentResponse(payment);

  order.paymentStatus = 'paid';
  order.razorpayPaymentId = payment.id || getDocPaymentId(order);
  order.paymentFlow = order.paymentFlow || {};
  order.paymentFlow.razorpayPaymentId = order.razorpayPaymentId;
  order.paymentFlow.capturedAt = order.paymentFlow.capturedAt || now;
  order.paymentFlow.captureAmount = Math.round(amount);
  order.paymentFlow.captureResponseSafeSummary = summary;
  order.paymentFlow.captureFailureReason = '';
  order.razorpay = order.razorpay || {};
  order.razorpay.paymentId = order.razorpayPaymentId;
  order.razorpay.capturedAt = order.razorpay.capturedAt || now;
  order.razorpay.captureAmount = Math.round(amount);
  order.razorpay.captureResponseSafeSummary = summary;
  order.razorpay.captureFailureReason = '';
};

const safeCapturePaymentOnce = async (order) => {
  const paymentId = getDocPaymentId(order);
  const amount = Math.round((order.finalTotal || 0) * 100);

  if (!paymentId) {
    throw new Error('Cannot capture payment without a Razorpay payment id');
  }

  order.paymentFlow = order.paymentFlow || {};
  order.razorpay = order.razorpay || {};

  if (order.paymentStatus === 'paid' || order.paymentFlow.capturedAt || order.razorpay.capturedAt) {
    return {
      captured: true,
      idempotent: true,
      payment: order.paymentFlow.captureResponseSafeSummary || {}
    };
  }

  if (isLocalPaymentId(paymentId)) {
    const payment = {
      id: paymentId,
      order_id: getDocOrderId(order),
      status: 'captured',
      amount,
      currency: 'INR',
      mode: 'simulated'
    };
    applyCapturedPaymentToOrder(order, payment, amount);
    return { captured: true, idempotent: false, payment };
  }

  const fetched = await fetchPayment(paymentId);

  if (fetched?.status === 'captured') {
    applyCapturedPaymentToOrder(order, fetched, fetched.amount || amount);
    return { captured: true, idempotent: true, payment: fetched };
  }

  if (fetched?.status !== 'authorized') {
    const reason = `Payment is ${fetched?.status || 'unavailable'} and cannot be captured`;
    order.paymentStatus = ['failed', 'refunded'].includes(fetched?.status) ? fetched.status : 'capture_failed';
    order.paymentFlow.captureFailureReason = reason;
    order.razorpay.captureFailureReason = reason;
    return { captured: false, reason, payment: fetched };
  }

  order.paymentStatus = 'capture_pending';
  const captured = await capturePayment({
    paymentId,
    amount: fetched.amount || amount,
    currency: fetched.currency || 'INR'
  });
  applyCapturedPaymentToOrder(order, captured, captured.amount || fetched.amount || amount);

  return { captured: true, idempotent: false, payment: captured };
};

const safeCaptureBidPaymentOnce = async (bid) => {
  const paymentId = bid.razorpayPaymentId || bid.razorpay?.paymentId || '';
  const amount = Math.round((bid.amount || 0) * 100);

  if (!paymentId) {
    throw new Error('Cannot capture bid payment without a Razorpay payment id');
  }

  bid.razorpay = bid.razorpay || {};

  if (bid.paymentStatus === 'captured' || bid.razorpay.capturedAt) {
    return {
      captured: true,
      idempotent: true,
      payment: { id: paymentId, status: 'captured' }
    };
  }

  if (isLocalPaymentId(paymentId)) {
    const payment = {
      id: paymentId,
      order_id: bid.razorpayOrderId || bid.razorpay.orderId || '',
      status: 'captured',
      amount,
      currency: 'INR',
      mode: 'simulated'
    };
    bid.paymentStatus = 'captured';
    bid.razorpay.capturedAt = new Date();
    bid.razorpay.captureAmount = amount;
    return { captured: true, idempotent: false, payment };
  }

  const fetched = await fetchPayment(paymentId);

  if (fetched?.status === 'captured') {
    bid.paymentStatus = 'captured';
    bid.razorpay.capturedAt = bid.razorpay.capturedAt || new Date();
    bid.razorpay.captureAmount = fetched.amount || amount;
    return { captured: true, idempotent: true, payment: fetched };
  }

  if (fetched?.status !== 'authorized') {
    const reason = `Bid payment is ${fetched?.status || 'unavailable'} and cannot be captured`;
    bid.paymentStatus = ['failed', 'refunded'].includes(fetched?.status) ? fetched.status : 'capture_failed';
    bid.razorpay.captureFailureReason = reason;
    return { captured: false, reason, payment: fetched };
  }

  const captured = await capturePayment({
    paymentId,
    amount: fetched.amount || amount,
    currency: fetched.currency || 'INR'
  });

  bid.paymentStatus = 'captured';
  bid.razorpay.capturedAt = new Date();
  bid.razorpay.captureAmount = captured.amount || fetched.amount || amount;
  bid.razorpay.captureFailureReason = '';

  return { captured: true, idempotent: false, payment: captured };
};

const createRefund = async (paymentId, amount, notes = {}) => {
  if (!env.razorpayEnableLiveRefunds) {
    return {
      id: `mock_refund_${Date.now()}`,
      amount: Math.round(amount),
      status: 'processed',
      notes,
      created_at: Math.floor(Date.now() / 1000),
      mode: 'simulated'
    };
  }

  return razorpay.payments.refund(paymentId, {
    amount: Math.round(amount),
    speed: 'normal',
    notes
  });
};

const releaseAuthorization = async (paymentId, _notes = {}) => {
  if (!paymentId) {
    throw new Error('Cannot release authorization without a Razorpay payment id');
  }

  if (isLocalPaymentId(paymentId)) {
    return {
      id: `mock_release_${Date.now()}`,
      payment_id: paymentId,
      status: 'processed',
      mode: 'simulated'
    };
  }

  const payment = await fetchPayment(paymentId);

  if (['refunded', 'failed', 'cancelled'].includes(payment?.status)) {
    return {
      id: paymentId,
      payment_id: paymentId,
      status: 'processed',
      mode: 'idempotent',
      payment
    };
  }

  if (payment?.status === 'authorized') {
    throw new Error('Razorpay does not provide an API to immediately release authorized payments. The authorization will auto-refund after the manual capture timeout.');
  }

  if (payment?.status === 'captured') {
    throw new Error('Payment is captured and must go through the refund flow, not authorization release.');
  }

  throw new Error(`Payment is ${payment?.status || 'unavailable'} and cannot be released as an authorization`);
};

const verifyRefundWebhookIfApplicable = (body, signature) => verifyWebhookSignature(body, signature);

const handleRefundProcessedWebhook = (payload = {}) => ({
  razorpayRefundId: payload.refund?.entity?.id || payload.entity?.id || '',
  status: 'refunded',
  metadata: payload
});

const handleRefundFailedWebhook = (payload = {}) => ({
  razorpayRefundId: payload.refund?.entity?.id || payload.entity?.id || '',
  status: 'failed',
  failureReason: payload.refund?.entity?.error_description || payload.entity?.error_description || 'Refund failed',
  metadata: payload
});

module.exports = {
  razorpay,
  verifyWebhookSignature,
  createManualCaptureOrder,
  verifyPaymentSignature,
  fetchPayment,
  initiateRouteTransfer,
  createLinkedAccount,
  addLinkedAccountBankAccount,
  releaseTransferOnHold,
  capturePayment,
  summarizePaymentResponse,
  safeCapturePaymentOnce,
  safeCaptureBidPaymentOnce,
  createRefund,
  releaseAuthorization,
  verifyRefundWebhookIfApplicable,
  handleRefundProcessedWebhook,
  handleRefundFailedWebhook
};
