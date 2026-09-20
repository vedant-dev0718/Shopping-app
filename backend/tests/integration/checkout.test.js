const Order = require('../../src/modules/orders/order.model');
const Product = require('../../src/modules/products/product.model');
const env = require('../../src/config/env');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');

const shippingInfo = {
  name: 'Buyer QA', email: 'buyer@example.com', phone: '9999999999',
  address: '123 QA Street', city: 'Jaipur', state: 'Rajasthan', postalCode: '302001'
};

const fixture = async () => {
  const buyer = await createBuyer();
  const seller = await createSeller({ upiId: 'seller@upi' });
  const product = await createProduct(seller, { price: 299, stock: 5 });
  await api().post('/api/cart/items').set('Authorization', authHeader(buyer))
    .send({ productId: product._id, quantity: 1 }).expect(201);
  return { buyer, seller, product };
};

describe('direct seller checkout', () => {
  test('quote advertises only enabled payment methods', async () => {
    const { buyer } = await fixture();
    const original = env.enableCodCheckout;
    try {
      env.enableCodCheckout = false;
      const quote = await api().post('/api/checkout/start').set('Authorization', authHeader(buyer)).expect(200);
      expect(quote.body.data.paymentMethods).toEqual(['UPI_QR']);
      await api().post('/api/checkout/place-cod').set('Authorization', authHeader(buyer))
        .send({ paymentMethod: 'COD', shippingInfo }).expect(400);
      env.enableCodCheckout = true;
      const enabled = await api().post('/api/checkout/start').set('Authorization', authHeader(buyer)).expect(200);
      expect(enabled.body.data.paymentMethods).toEqual(['UPI_QR', 'COD']);
    } finally {
      env.enableCodCheckout = original;
    }
  });

  test.each([['COD', 'place-cod', 'pending'], ['UPI_QR', 'place-qr-payment', 'pending_seller_confirmation']])(
    '%s splits store orders and shipping without collecting or inventing a payment',
    async (paymentMethod, endpoint, paymentStatus) => {
      const { buyer, seller, product } = await fixture();
      const seller2 = await createSeller({ email: 'seller2@example.com', storeName: 'Second Store', upiId: 'second@upi' });
      const product2 = await createProduct(seller2, { price: 99, stock: 4 });
      await api().post('/api/cart/items').set('Authorization', authHeader(buyer))
        .send({ productId: product2._id, quantity: 1 }).expect(201);
      const quote = await api().post('/api/checkout/start').set('Authorization', authHeader(buyer)).expect(200);
      expect(quote.body.data.storePaymentGroups).toHaveLength(2);
      const groups = quote.body.data.storePaymentGroups;
      expect(groups.every((group) => group.qrCode.startsWith('upi://pay?'))).toBe(true);
      expect(new Set(groups.map((group) => group.qrCode)).size).toBe(2);
      const placed = await api().post(`/api/checkout/${endpoint}`).set('Authorization', authHeader(buyer))
        .send({ paymentMethod, shippingInfo }).expect(201);
      expect(placed.body.data.orders).toHaveLength(2);
      const orders = await Order.find({ buyerId: buyer._id }).lean();
      expect(orders.reduce((sum, order) => sum + order.finalTotal, 0)).toBeCloseTo(quote.body.data.cart.finalTotal, 2);
      for (const order of orders) {
        expect(order.sellerIds).toHaveLength(1);
        expect(order.paymentStatus).toBe(paymentStatus);
        expect(order.paymentMethod).toBe(paymentMethod);
        expect(order.payoutStatus).toBe('pending');
      }
      expect((await Product.findById(product._id)).stock).toBe(5);
      const cart = await api().get('/api/cart').set('Authorization', authHeader(buyer)).expect(200);
      expect(cart.body.data.items).toEqual([]);
      if (paymentMethod === 'UPI_QR') {
        const order = orders.find((entry) => String(entry.sellerIds[0]) === String(seller._id));
        await api().post(`/api/seller/orders/${order._id}/accept`).set('Authorization', authHeader(seller))
          .send({}).expect(400);
        await api().post(`/api/seller/orders/${order._id}/confirm-payment`).set('Authorization', authHeader(seller2))
          .send({}).expect(404);
        await api().post(`/api/seller/orders/${order._id}/confirm-payment`).set('Authorization', authHeader(seller))
          .send({}).expect(200);
        expect((await Order.findById(order._id)).paymentStatus).toBe('paid');
        await api().post(`/api/seller/orders/${order._id}/accept`).set('Authorization', authHeader(seller))
          .send({}).expect(200);
        expect((await Product.findById(product._id)).stock).toBe(4);
      }
    }
  );

  test('removed verification endpoint is not available and never creates an order', async () => {
    const { buyer } = await fixture();
    await api().post('/api/checkout/verify').set('Authorization', authHeader(buyer)).send({}).expect(404);
    expect(await Order.countDocuments()).toBe(0);
  });

  test('validates shipping, payment method, role and stock', async () => {
    const { buyer, seller, product } = await fixture();
    await api().post('/api/checkout/place-cod').set('Authorization', authHeader(buyer))
      .send({ paymentMethod: 'COD' }).expect(400);
    await api().post('/api/checkout/place-cod').set('Authorization', authHeader(buyer))
      .send({ paymentMethod: 'UPI_QR', shippingInfo }).expect(400);
    await api().post('/api/checkout/start').set('Authorization', authHeader(seller)).expect(403);
    await Product.updateOne({ _id: product._id }, { stock: 0 });
    await api().post('/api/checkout/place-cod').set('Authorization', authHeader(buyer))
      .send({ paymentMethod: 'COD', shippingInfo }).expect(400);
    expect(await Order.countDocuments()).toBe(0);
  });
});
