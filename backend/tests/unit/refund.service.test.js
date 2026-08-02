const crypto = require('crypto');

const razorpayUtils = require('../../src/utils/razorpay');

describe('refund and Razorpay utility behavior', () => {
  test('uses mock refunds when live refunds are disabled', async () => {
    process.env.RAZORPAY_ENABLE_LIVE_REFUNDS = 'false';

    const refund = await razorpayUtils.createRefund('pay_test_123', 49900, { reason: 'qa' });

    expect(refund.id).toMatch(/^mock_refund_/);
    expect(refund.status).toBe('processed');
    expect(refund.mode).toBe('simulated');
  });

  test('releaseAuthorization checks Razorpay and does not fake-release real authorized payments', async () => {
    razorpayUtils.razorpay.payments.fetch.mockResolvedValueOnce({
      id: 'pay_authorized_release',
      status: 'authorized',
      amount: 49900,
      currency: 'INR'
    });

    await expect(razorpayUtils.releaseAuthorization('pay_authorized_release', {
      orderId: 'order_123',
      reason: 'seller_rejected'
    })).rejects.toThrow('Razorpay does not provide an API to immediately release authorized payments');

    expect(razorpayUtils.razorpay.payments.fetch).toHaveBeenCalledWith('pay_authorized_release');
    expect(razorpayUtils.razorpay.payments.refund).not.toHaveBeenCalled();
  });

  test('rejects invalid webhook signatures and accepts valid signatures', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured' });
    const validSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    expect(razorpayUtils.verifyWebhookSignature(rawBody, 'bad-signature')).toBe(false);
    expect(razorpayUtils.verifyWebhookSignature(rawBody, validSignature)).toBe(true);
  });
});
