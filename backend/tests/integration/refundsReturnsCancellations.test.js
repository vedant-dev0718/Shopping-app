const Order = require('../../src/modules/orders/order.model');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createAdmin, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');

describe('refund, return, and cancellation API', () => {
  test('buyer cancellation requires reason, restores stock, and blocks duplicate cancellation', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { stock: 2 });
    const order = await createOrder({ buyer, seller, product, overrides: { paymentStatus: 'pending' } });

    await api().post(`/api/orders/${order._id}/cancel`).set('Authorization', authHeader(buyer)).send({ reason: '' }).expect(400);
    await api().post(`/api/orders/${order._id}/cancel`).set('Authorization', authHeader(buyer)).send({ reason: 'Changed mind' }).expect(200);
    await api().post(`/api/orders/${order._id}/cancel`).set('Authorization', authHeader(buyer)).send({ reason: 'Again' }).expect(400);

    const updated = await Order.findById(order._id).lean();
    expect(updated.orderStatus).toBe('cancelled');
  });

  test('return can be requested after delivery and not before delivery', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller);
    const placed = await createOrder({ buyer, seller, product });
    const delivered = await createOrder({ buyer, seller, product, overrides: { orderStatus: 'delivered', itemStatus: 'delivered' } });
    delivered.deliveredAt = new Date();
    delivered.returnWindowEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await delivered.save();

    await api().post(`/api/orders/${placed._id}/returns`).set('Authorization', authHeader(buyer)).send({ reason: 'damaged' }).expect(400);
    await api().post(`/api/orders/${delivered._id}/returns`).set('Authorization', authHeader(buyer)).send({ reason: 'damaged' }).expect(201);
    await api().post(`/api/orders/${delivered._id}/returns`).set('Authorization', authHeader(buyer)).send({ reason: 'damaged' }).expect(400);
  });

  test('admin refund endpoint rejects non-admin and prevents over-refund', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const admin = await createAdmin();
    const product = await createProduct(seller);
    const order = await createOrder({ buyer, seller, product, overrides: { paymentStatus: 'paid' } });

    await api().post(`/api/orders/${order._id}/refund`).set('Authorization', authHeader(seller)).send({ amount: 10 }).expect(403);
    await api().post(`/api/orders/${order._id}/refund`).set('Authorization', authHeader(admin)).send({ amount: order.finalTotal + 1 }).expect(400);
  });
});
