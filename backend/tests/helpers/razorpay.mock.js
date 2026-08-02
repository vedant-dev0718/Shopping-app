const crypto = require('crypto');

const signWebhookBody = (body, secret = process.env.RAZORPAY_WEBHOOK_SECRET) => crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');

const paymentCapturedPayload = (overrides = {}) => ({
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: overrides.paymentId || 'pay_mock_123',
        order_id: overrides.razorpayOrderId || 'order_mock_123',
        amount: overrides.amount || 10000,
        fee: overrides.fee || 0,
        tax: overrides.tax || 0,
        status: 'captured'
      }
    }
  }
});

module.exports = {
  signWebhookBody,
  paymentCapturedPayload
};
