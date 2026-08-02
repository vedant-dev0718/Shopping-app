const Product = require('../../src/modules/products/product.model');
const AnalyticsEvent = require('../../src/modules/analytics/analyticsEvent.model');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct, productPayload } = require('../helpers/mockData.helper');

describe('product API', () => {
  test('seller can create, edit, and delete own product while buyer can view/save/click', async () => {
    const seller = await createSeller();
    const buyer = await createBuyer();

    const createResponse = await api()
      .post('/api/seller/products')
      .set('Authorization', authHeader(seller))
      .send(productPayload({ productLink: '', stock: 3 }))
      .expect(201);

    const productId = createResponse.body.data._id;
    expect(createResponse.body.data.productLink).toBe('');

    await api().get('/api/products').expect(200).expect((res) => {
      expect(res.body.data).toHaveLength(1);
    });

    await api().post(`/api/products/${productId}/save`).set('Authorization', authHeader(buyer)).expect(200);
    await api().post(`/api/products/${productId}/click`).set('Authorization', authHeader(buyer)).expect(200);

    const event = await AnalyticsEvent.findOne({ productId, eventType: 'product_click' });
    expect(event).toBeTruthy();

    await api()
      .patch(`/api/seller/products/${productId}`)
      .set('Authorization', authHeader(seller))
      .send({ stock: 0 })
      .expect(200);

    const soldOut = await Product.findById(productId).lean();
    expect(soldOut.status).toBe('sold_out');

    await api().delete(`/api/seller/products/${productId}`).set('Authorization', authHeader(seller)).expect(200);
  });

  test('validation and ownership checks reject unsafe product changes', async () => {
    const seller = await createSeller();
    const otherSeller = await createSeller({ email: 'other-seller@example.com' });
    const product = await createProduct(seller);

    await api().post('/api/seller/products').set('Authorization', authHeader(seller)).send(productPayload({ title: '' })).expect(400);
    await api().post('/api/seller/products').set('Authorization', authHeader(seller)).send(productPayload({ price: -1 })).expect(400);
    await api().post('/api/seller/products').set('Authorization', authHeader(seller)).send(productPayload({ stock: -1 })).expect(400);
    await api().patch(`/api/seller/products/${product._id}`).set('Authorization', authHeader(otherSeller)).send({ title: 'Nope' }).expect(404);
  });
});
