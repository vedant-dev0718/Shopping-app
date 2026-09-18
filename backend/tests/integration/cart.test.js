const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');

describe('cart API', () => {
  test('buyer cart add, update, and remove recalculate totals', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { price: 200, stock: 5 });

    const added = await api()
      .post('/api/cart/items')
      .set('Authorization', authHeader(buyer))
      .send({ productId: product._id, quantity: 2 })
      .expect(201);

    expect(added.body.data.subtotal).toBe(400);
    expect(added.body.data.finalTotal).toBe(499);

    const itemId = added.body.data.items[0]._id;
    const updated = await api()
      .patch(`/api/cart/items/${itemId}`)
      .set('Authorization', authHeader(buyer))
      .send({ quantity: 3 })
      .expect(200);

    expect(updated.body.data.subtotal).toBe(600);
    expect(updated.body.data.shipping).toBe(0);

    const removed = await api().delete(`/api/cart/items/${itemId}`).set('Authorization', authHeader(buyer)).expect(200);
    expect(removed.body.data.items).toHaveLength(0);
  });

  test('cart rejects seller, unauthenticated, sold-out, inactive, and over-stock adds', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const soldOut = await createProduct(seller, { stock: 0 });
    const inactive = await createProduct(seller, { status: 'inactive', stock: 2 });
    const active = await createProduct(seller, { stock: 2 });

    await api().post('/api/cart/items').send({ productId: active._id, quantity: 1 }).expect(401);
    await api().post('/api/cart/items').set('Authorization', authHeader(seller)).send({ productId: active._id, quantity: 1 }).expect(403);
    await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: soldOut._id, quantity: 1 }).expect(400);
    await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: inactive._id, quantity: 1 }).expect(400);
    await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: active._id, quantity: 3 }).expect(400);
  });
});
