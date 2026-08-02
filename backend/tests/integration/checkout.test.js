const crypto = require('crypto');

const Product = require('../../src/modules/products/product.model');
const Order = require('../../src/modules/orders/order.model');
const env = require('../../src/config/env');
const { razorpay } = require('../../src/utils/razorpay');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');

const shippingInfo = {
  name: 'Buyer QA',
  email: 'buyer@example.com',
  phone: '9999999999',
  address: '123 QA Street',
  city: 'Jaipur',
  state: 'Rajasthan',
  postalCode: '302001'
};

const signPayment = (razorpayOrderId, razorpayPaymentId) => crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(`${razorpayOrderId}|${razorpayPaymentId}`)
  .digest('hex');

describe('checkout API with mocked Razorpay', () => {
  test('buyer checkout starts payment, creates awaiting-acceptance order, and clears cart', async () => {
    const originalManualCaptureEnabled = env.razorpayManualCaptureEnabled;
    env.razorpayManualCaptureEnabled = true;

    try {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const product = await createProduct(seller, { price: 250, stock: 3 });

      await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: product._id, quantity: 2 }).expect(201);

      const start = await api().post('/api/checkout/start').set('Authorization', authHeader(buyer)).expect(200);
      const razorpayOrderId = start.body.data.razorpayOrderId;
      const razorpayPaymentId = 'pay_checkout_success_123';
      expect(razorpayOrderId).toBeTruthy();

      razorpay.payments.fetch.mockResolvedValueOnce({
        id: razorpayPaymentId,
        order_id: razorpayOrderId,
        status: 'authorized',
        amount: 50000,
        currency: 'INR',
        method: 'upi'
      });

      const placed = await api()
        .post('/api/checkout/verify')
        .set('Authorization', authHeader(buyer))
        .send({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: signPayment(razorpayOrderId, razorpayPaymentId),
          shippingInfo,
          paymentMethod: 'UPI'
        })
        .expect(201);

      expect(placed.body.data.orderNumber).toBeTruthy();
      const updatedProduct = await Product.findById(product._id).lean();
      expect(updatedProduct.stock).toBe(3);

      const cart = await api().get('/api/cart').set('Authorization', authHeader(buyer)).expect(200);
      expect(cart.body.data.items).toHaveLength(0);

      const order = await Order.findById(placed.body.data.orderId).lean();
      expect(order.items[0].sellerId.toString()).toBe(seller._id.toString());
      expect(order.orderStatus).toBe('awaiting_seller_acceptance');
      expect(order.items[0].itemAcceptanceStatus).toBe('pending');
    } finally {
      env.razorpayManualCaptureEnabled = originalManualCaptureEnabled;
    }
  });

  test('checkout rejects missing shipping info and seller cart access', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller);
    await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: product._id, quantity: 1 }).expect(201);

    await api().post('/api/checkout/verify').set('Authorization', authHeader(buyer)).send({ paymentMethod: 'UPI' }).expect(400);
    await api().post('/api/checkout/place-order').set('Authorization', authHeader(buyer)).send({ paymentMethod: 'UPI' }).expect(404);
    await api().post('/api/checkout/start').set('Authorization', authHeader(seller)).expect(403);
  });

  test('checkout verify rejects payment amount mismatch before creating an order', async () => {
    const originalManualCaptureEnabled = env.razorpayManualCaptureEnabled;
    env.razorpayManualCaptureEnabled = true;

    try {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const product = await createProduct(seller, { price: 250, stock: 3 });

      await api()
        .post('/api/cart/items')
        .set('Authorization', authHeader(buyer))
        .send({ productId: product._id, quantity: 2 })
        .expect(201);

      const start = await api()
        .post('/api/checkout/start')
        .set('Authorization', authHeader(buyer))
        .expect(200);

      const razorpayOrderId = start.body.data.razorpayOrderId;
      const razorpayPaymentId = 'pay_underpaid_checkout_123';

      razorpay.payments.fetch.mockResolvedValueOnce({
        id: razorpayPaymentId,
        order_id: razorpayOrderId,
        status: 'authorized',
        amount: 40000,
        currency: 'INR',
        method: 'card'
      });

      const response = await api()
        .post('/api/checkout/verify')
        .set('Authorization', authHeader(buyer))
        .send({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: signPayment(razorpayOrderId, razorpayPaymentId),
          shippingInfo,
          paymentMethod: 'card'
        })
        .expect(400);

      expect(response.body.message).toContain('Payment amount mismatch');
      expect(await Order.countDocuments({ buyerId: buyer._id })).toBe(0);

      const cart = await api().get('/api/cart').set('Authorization', authHeader(buyer)).expect(200);
      expect(cart.body.data.items).toHaveLength(1);
    } finally {
      env.razorpayManualCaptureEnabled = originalManualCaptureEnabled;
    }
  });

  test('checkout verify accepts legacy addressId alias as deliveryAddressId', async () => {
    const buyer = await createBuyer({ email: 'checkout-alias-buyer@example.com' });

    const response = await api()
      .post('/api/checkout/verify')
      .set('Authorization', authHeader(buyer))
      .send({
        razorpayOrderId: 'order_alias_contract_check',
        razorpayPaymentId: 'pay_alias_contract_check',
        razorpaySignature: 'invalid-signature',
        addressId: '66b0e2b1a3f31ecbe0a12345',
        paymentMethod: 'card'
      })
      .expect(400);

    expect(response.body.message).toBe('Payment verification failed');
  });
});
