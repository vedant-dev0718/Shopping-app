const Order = require('../../src/modules/orders/order.model');
const SellerProfile = require('../../src/modules/sellers/sellerProfile.model');
const { api } = require('../helpers/testServer.helper');
const { createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');
const { signWebhookBody, paymentCapturedPayload } = require('../helpers/razorpay.mock');

describe('Razorpay webhook API with raw body verification', () => {
  test('payment.captured webhook marks matching order paid and remains idempotent', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller);
    const order = await createOrder({ buyer, seller, product, overrides: { paymentStatus: 'pending', orderStatus: 'pending' } });
    order.razorpayOrderId = 'order_mock_123';
    await order.save();

    const body = JSON.stringify(paymentCapturedPayload({ razorpayOrderId: 'order_mock_123', paymentId: 'pay_mock_123' }));
    const signature = signWebhookBody(body);

    await api().post('/webhooks/razorpay').set('x-razorpay-signature', signature).set('Content-Type', 'application/json').send(body).expect(200);
    await api().post('/webhooks/razorpay').set('x-razorpay-signature', signature).set('Content-Type', 'application/json').send(body).expect(200);

    const updated = await Order.findById(order._id).lean();
    expect(updated.paymentStatus).toBe('paid');
    expect(updated.razorpayPaymentId).toBe('pay_mock_123');
  });

  test('payment.captured webhook deducts Razorpay fees from seller Route transfer', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    await SellerProfile.findOneAndUpdate(
      { userId: seller._id },
      {
        razorpayLinkedAccountId: 'acc_seller_route_123',
        razorpayLinkedAccountStatus: 'active'
      }
    );
    const product = await createProduct(seller, { price: 1000 });
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        paymentStatus: 'pending',
        orderStatus: 'pending',
        shipping: 0,
        totalPlatformCommission: 100,
        totalSellerEarnings: 900
      }
    });
    order.items[0].commissionPercentage = 10;
    order.items[0].platformCommissionAmount = 100;
    order.items[0].sellerEarningsAmount = 900;
    order.razorpayOrderId = 'order_fee_test';
    await order.save();

    const body = JSON.stringify(paymentCapturedPayload({
      razorpayOrderId: 'order_fee_test',
      paymentId: 'pay_fee_test',
      amount: 100000,
      fee: 2400,
      tax: 366
    }));
    const signature = signWebhookBody(body);

    await api()
      .post('/webhooks/razorpay')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(200);

    const updated = await Order.findById(order._id).lean();
    expect(updated.paymentFlow.razorpayFees).toBe(24);
    expect(updated.paymentFlow.razorpayTax).toBe(3.66);
    expect(updated.items[0].paymentFeeAmount).toBe(24);
    expect(updated.items[0].sellerEarningsAmount).toBe(876);
    expect(updated.sellerPayoutAmount).toBe(876);
    expect(updated.razorpayTransfers[0].amount).toBe(876);
    expect(updated.razorpayTransfers[0].transferId).toBe('trf_mock_1');
  });

  test('invalid JSON payload is rejected before payment mutation', async () => {
    await api()
      .post('/webhooks/razorpay')
      .set('x-razorpay-signature', 'bad')
      .set('Content-Type', 'application/json')
      .send('{bad-json')
      .expect(400);
  });
});
