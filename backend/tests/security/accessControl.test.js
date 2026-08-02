const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');

describe('security: ownership access control', () => {
  test('buyer cannot access or mutate another buyer order by guessing its id', async () => {
    const buyer = await createBuyer({ email: 'order-owner@example.com' });
    const otherBuyer = await createBuyer({ email: 'order-intruder@example.com' });
    const seller = await createSeller({ email: 'order-owner-seller@example.com' });
    const product = await createProduct(seller);
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        orderStatus: 'delivered',
        itemStatus: 'delivered'
      }
    });
    order.deliveredAt = new Date();
    order.returnWindowEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await order.save();

    await api().get(`/api/orders/${order._id}`).set('Authorization', authHeader(otherBuyer)).expect(404);
    await api()
      .post(`/api/orders/${order._id}/cancel`)
      .set('Authorization', authHeader(otherBuyer))
      .send({ reason: 'Trying to cancel someone else order' })
      .expect(404);
    await api()
      .post(`/api/orders/${order._id}/returns`)
      .set('Authorization', authHeader(otherBuyer))
      .send({ reason: 'damaged' })
      .expect(404);
    await api().get(`/api/orders/${order._id}/refund-status`).set('Authorization', authHeader(otherBuyer)).expect(404);
    await api().get(`/api/orders/${order._id}/return-status`).set('Authorization', authHeader(otherBuyer)).expect(404);
    await api()
      .post('/api/returns')
      .set('Authorization', authHeader(otherBuyer))
      .send({
        orderId: order._id.toString(),
        itemId: order.items[0]._id.toString(),
        reason: 'damaged'
      })
      .expect(404);
  });

  test('seller cannot access another seller product or order item', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const otherSeller = await createSeller({ email: 'access-other@example.com' });
    const product = await createProduct(seller);
    const order = await createOrder({ buyer, seller, product });

    await api().patch(`/api/seller/products/${product._id}`).set('Authorization', authHeader(otherSeller)).send({ title: 'Stolen' }).expect(404);
    await api().get(`/api/seller/orders/${order._id}`).set('Authorization', authHeader(otherSeller)).expect(404);
  });

  test('seller cannot mutate another seller order by guessing its id', async () => {
    const buyer = await createBuyer({ email: 'seller-order-buyer@example.com' });
    const seller = await createSeller({ email: 'seller-order-owner@example.com' });
    const otherSeller = await createSeller({ email: 'seller-order-intruder@example.com' });
    const product = await createProduct(seller);
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        orderStatus: 'awaiting_seller_acceptance',
        itemStatus: 'awaiting_seller_acceptance',
        itemAcceptanceStatus: 'pending',
        paymentStatus: 'paid'
      }
    });

    await api()
      .post(`/api/seller/orders/${order._id}/accept`)
      .set('Authorization', authHeader(otherSeller))
      .send({ message: 'I accept this stolen order' })
      .expect(404);
    await api()
      .post(`/api/seller/orders/${order._id}/reject`)
      .set('Authorization', authHeader(otherSeller))
      .send({
        reason: 'Product unavailable',
        messageToBuyer: 'Trying to reject someone else order'
      })
      .expect(404);
    await api()
      .patch(`/api/seller/orders/${order._id}/status`)
      .set('Authorization', authHeader(otherSeller))
      .send({ orderStatus: 'processing' })
      .expect(404);
    await api()
      .patch(`/api/seller/orders/${order._id}/cancel`)
      .set('Authorization', authHeader(otherSeller))
      .send({ cancelReason: 'Trying to cancel someone else order' })
      .expect(404);
  });
});
