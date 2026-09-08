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
  test('checkout start includes COD only when feature flag is enabled', async () => {
    const originalCodFlag = env.enableCodCheckout;

    try {
      const buyer = await createBuyer({ email: 'cod-flag-buyer@example.com' });
      const seller = await createSeller();
      const product = await createProduct(seller, { price: 199, stock: 5 });

      await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: product._id, quantity: 1 }).expect(201);

      env.enableCodCheckout = false;
      const withoutCod = await api().post('/api/checkout/start').set('Authorization', authHeader(buyer)).expect(200);
      expect(withoutCod.body.data.paymentMethods).not.toContain('COD');

      env.enableCodCheckout = true;
      const withCod = await api().post('/api/checkout/start').set('Authorization', authHeader(buyer)).expect(200);
      expect(withCod.body.data.paymentMethods).toContain('COD');
      expect(withCod.body.data.paymentMethods).not.toContain('RAZORPAY');
    } finally {
      env.enableCodCheckout = originalCodFlag;
    }
  });

  test('checkout start groups store-specific COD payment metadata for a multi-store cart', async () => {
    const originalCodFlag = env.enableCodCheckout;
    env.enableCodCheckout = true;

    try {
      const buyer = await createBuyer({ email: 'multi-store-cod-buyer@example.com' });
      const seller1 = await createSeller({ email: 'multi-store-seller-1@example.com', storeName: 'Store One', upiId: 'storeone@upi' });
      const seller2 = await createSeller({ email: 'multi-store-seller-2@example.com', storeName: 'Store Two', upiId: 'storetwo@upi' });
      const product1 = await createProduct(seller1, { price: 299, stock: 3, title: 'Saree A' });
      const product2 = await createProduct(seller2, { price: 499, stock: 4, title: 'Dupatta B' });

      await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: product1._id, quantity: 1 }).expect(201);
      await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: product2._id, quantity: 1 }).expect(201);

      const response = await api().post('/api/checkout/start').set('Authorization', authHeader(buyer)).expect(200);

      expect(response.body.data.paymentMethods).toContain('COD');
      expect(response.body.data.storePaymentGroups).toHaveLength(2);
      expect(response.body.data.storePaymentGroups.every((group) => group.paymentMethods.includes('COD'))).toBe(true);
      expect(response.body.data.storePaymentGroups.every((group) => !group.paymentMethods.includes('RAZORPAY'))).toBe(true);

      const qrCodes = response.body.data.storePaymentGroups.map((group) => group.qrCode);
      expect(qrCodes.every((qrCode) => typeof qrCode === 'string' && qrCode.startsWith('upi://pay?'))).toBe(true);
      expect(new Set(qrCodes).size).toBe(2);

      const groupByStoreName = new Map(
        response.body.data.storePaymentGroups.map((group) => [group.storeName, group])
      );
      expect(groupByStoreName.get('Store One').qrCode).toContain('pa=storeone%40upi');
      expect(groupByStoreName.get('Store Two').qrCode).toContain('pa=storetwo%40upi');
      expect(groupByStoreName.get('Store One').qrCode).toContain('am=299.00');
      expect(groupByStoreName.get('Store Two').qrCode).toContain('am=499.00');
    } finally {
      env.enableCodCheckout = originalCodFlag;
    }
  });

  test('buyer can place COD order via /checkout/place-cod and order has COD-safe payment fields', async () => {
    const originalCodFlag = env.enableCodCheckout;
    env.enableCodCheckout = true;

    try {
      const buyer = await createBuyer({ email: 'cod-place-buyer@example.com' });
      const seller = await createSeller();
      const product = await createProduct(seller, { price: 799, stock: 4 });

      await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: product._id, quantity: 2 }).expect(201);

      const placed = await api()
        .post('/api/checkout/place-cod')
        .set('Authorization', authHeader(buyer))
        .send({
          paymentMethod: 'COD',
          shippingInfo
        })
        .expect(201);

      expect(placed.body.data.orderNumber).toBeTruthy();
      expect(placed.body.data.paymentStatus).toBe('pending');
      expect(placed.body.data.orderStatus).toBe('awaiting_seller_acceptance');

      const order = await Order.findById(placed.body.data.orderId).lean();
      expect(order.paymentMethod).toBe('COD');
      expect(order.razorpayOrderId).toBe('');
      expect(order.razorpayPaymentId).toBe('');

      const cart = await api().get('/api/cart').set('Authorization', authHeader(buyer)).expect(200);
      expect(cart.body.data.items).toHaveLength(0);
    } finally {
      env.enableCodCheckout = originalCodFlag;
    }
  });

  test('multi-store COD cart creates one order per store without changing the buyer total', async () => {
    const originalCodFlag = env.enableCodCheckout;
    env.enableCodCheckout = true;

    try {
      const buyer = await createBuyer({ email: 'cod-split-buyer@example.com' });
      const sellerA = await createSeller({ email: 'cod-split-seller-a@example.com', storeName: 'Split Store A' });
      const sellerB = await createSeller({ email: 'cod-split-seller-b@example.com', storeName: 'Split Store B' });
      const productA = await createProduct(sellerA, { price: 300, stock: 5, title: 'Split A' });
      const productB = await createProduct(sellerB, { price: 700, stock: 5, title: 'Split B' });

      await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: productA._id, quantity: 1 }).expect(201);
      await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: productB._id, quantity: 1 }).expect(201);

      const checkout = await api().post('/api/checkout/start').set('Authorization', authHeader(buyer)).expect(200);
      const quotedTotal = checkout.body.data.cart.finalTotal;

      const placed = await api()
        .post('/api/checkout/place-cod')
        .set('Authorization', authHeader(buyer))
        .send({ paymentMethod: 'COD', shippingInfo })
        .expect(201);

      expect(placed.body.data.orders).toHaveLength(2);

      const orders = await Order.find({ buyerId: buyer._id }).lean();
      expect(orders).toHaveLength(2);

      // Each order belongs to exactly one store and one seller.
      orders.forEach((order) => {
        const storeIds = [...new Set(order.items.map((item) => item.storeId.toString()))];
        expect(storeIds).toHaveLength(1);
        expect(order.sellerIds).toHaveLength(1);
      });

      const orderNumbers = new Set(orders.map((order) => order.orderNumber));
      expect(orderNumbers.size).toBe(2);

      const combinedTotal = orders.reduce((total, order) => total + order.finalTotal, 0);
      expect(Math.round(combinedTotal * 100) / 100).toBe(quotedTotal);

      const subtotals = orders.map((order) => order.subtotal).sort((a, b) => a - b);
      expect(subtotals).toEqual([300, 700]);
    } finally {
      env.enableCodCheckout = originalCodFlag;
    }
  });

  test('checkout place-cod rejects Razorpay-only fields in request body', async () => {
    const originalCodFlag = env.enableCodCheckout;
    env.enableCodCheckout = true;

    try {
      const buyer = await createBuyer({ email: 'cod-reject-razorpay@example.com' });
      const seller = await createSeller();
      const product = await createProduct(seller, { price: 499, stock: 2 });

      await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: product._id, quantity: 1 }).expect(201);

      const response = await api()
        .post('/api/checkout/place-cod')
        .set('Authorization', authHeader(buyer))
        .send({
          paymentMethod: 'COD',
          shippingInfo,
          razorpayOrderId: 'order_should_not_be_sent'
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors?.[0]?.msg).toBe('Razorpay fields are not allowed for COD checkout');
    } finally {
      env.enableCodCheckout = originalCodFlag;
    }
  });

  test('checkout verify rejects COD payment method and keeps online-only contract', async () => {
    const buyer = await createBuyer({ email: 'cod-verify-reject@example.com' });

    const response = await api()
      .post('/api/checkout/verify')
      .set('Authorization', authHeader(buyer))
      .send({
        paymentMethod: 'COD',
        razorpayOrderId: 'order_cod_wrong_route',
        razorpayPaymentId: 'pay_cod_wrong_route',
        razorpaySignature: 'signature_cod_wrong_route',
        shippingInfo
      })
      .expect(400);

    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors?.[0]?.msg).toContain('RAZORPAY');
  });

  test('buyer checkout starts payment, creates awaiting-acceptance order, and clears cart', async () => {
    const originalManualCaptureEnabled = env.razorpayManualCaptureEnabled;
    const originalCheckoutEnabled = env.razorpayCheckoutEnabled;
    env.razorpayManualCaptureEnabled = true;
    env.razorpayCheckoutEnabled = true;

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
          paymentMethod: 'RAZORPAY'
        })
        .expect(201);

      expect(placed.body.data.orderNumber).toBeTruthy();
      const updatedProduct = await Product.findById(product._id).lean();
      expect(updatedProduct.stock).toBe(3);

      const cart = await api().get('/api/cart').set('Authorization', authHeader(buyer)).expect(200);
      expect(cart.body.data.items).toHaveLength(0);

      const order = await Order.findById(placed.body.data.orderId).lean();
      expect(order.items[0].sellerId.toString()).toBe(seller._id.toString());
      expect(order.paymentMethod).toBe('RAZORPAY');
      expect(order.orderStatus).toBe('awaiting_seller_acceptance');
      expect(order.items[0].itemAcceptanceStatus).toBe('pending');
    } finally {
      env.razorpayManualCaptureEnabled = originalManualCaptureEnabled;
      env.razorpayCheckoutEnabled = originalCheckoutEnabled;
    }
  });

  test('checkout rejects missing shipping info and seller cart access', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller);
    await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: product._id, quantity: 1 }).expect(201);

    await api().post('/api/checkout/verify').set('Authorization', authHeader(buyer)).send({ paymentMethod: 'RAZORPAY' }).expect(400);
    await api().post('/api/checkout/place-order').set('Authorization', authHeader(buyer)).send({ paymentMethod: 'RAZORPAY' }).expect(404);
    await api().post('/api/checkout/start').set('Authorization', authHeader(seller)).expect(403);
  });

  test('checkout verify rejects payment amount mismatch before creating an order', async () => {
    const originalManualCaptureEnabled = env.razorpayManualCaptureEnabled;
    const originalCheckoutEnabled = env.razorpayCheckoutEnabled;
    env.razorpayManualCaptureEnabled = true;
    env.razorpayCheckoutEnabled = true;

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
          paymentMethod: 'RAZORPAY'
        })
        .expect(400);

      expect(response.body.message).toContain('Payment amount mismatch');
      expect(await Order.countDocuments({ buyerId: buyer._id })).toBe(0);

      const cart = await api().get('/api/cart').set('Authorization', authHeader(buyer)).expect(200);
      expect(cart.body.data.items).toHaveLength(1);
    } finally {
      env.razorpayManualCaptureEnabled = originalManualCaptureEnabled;
      env.razorpayCheckoutEnabled = originalCheckoutEnabled;
    }
  });

  test('checkout verify accepts legacy addressId alias as deliveryAddressId', async () => {
    const originalCheckoutEnabled = env.razorpayCheckoutEnabled;
    env.razorpayCheckoutEnabled = true;

    try {
      const buyer = await createBuyer({ email: 'checkout-alias-buyer@example.com' });
      const response = await api()
        .post('/api/checkout/verify')
        .set('Authorization', authHeader(buyer))
        .send({
          razorpayOrderId: 'order_alias_contract_check',
          razorpayPaymentId: 'pay_alias_contract_check',
          razorpaySignature: 'invalid-signature',
          addressId: '66b0e2b1a3f31ecbe0a12345',
          paymentMethod: 'RAZORPAY'
        })
        .expect(400);

      expect(response.body.message).toBe('Payment verification failed');
    } finally {
      env.razorpayCheckoutEnabled = originalCheckoutEnabled;
    }
  });
});
