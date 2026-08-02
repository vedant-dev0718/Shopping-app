const Product = require('../../src/modules/products/product.model');
const Report = require('../../src/modules/safety/report.model');
const ModerationAction = require('../../src/modules/safety/moderationAction.model');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createAdmin, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');

describe('reports, blocks, and moderation API', () => {
  test('user can report content once, reported content hides from reporter, and block/unblock toggles visibility', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { title: 'Reportable QA Product' });

    await api()
      .post('/api/safety/reports')
      .set('Authorization', authHeader(buyer))
      .send({ targetType: 'product', targetId: product._id, reason: 'counterfeit', details: 'Looks fake' })
      .expect(201);

    await api()
      .post('/api/safety/reports')
      .set('Authorization', authHeader(buyer))
      .send({ targetType: 'product', targetId: product._id, reason: 'counterfeit' })
      .expect(201);

    await api().get('/api/search/products?q=Reportable').set('Authorization', authHeader(buyer)).expect(200).expect((res) => {
      expect(res.body.data.some((item) => item._id === product._id.toString())).toBe(false);
    });

    await api().post(`/api/safety/blocks/${seller._id}`).set('Authorization', authHeader(buyer)).expect(200);
    await api().get('/api/safety/blocks').set('Authorization', authHeader(buyer)).expect(200).expect((res) => {
      expect(res.body.data.length).toBe(1);
    });
    await api().delete(`/api/safety/blocks/${seller._id}`).set('Authorization', authHeader(buyer)).expect(200);
  });

  test('admin can list and resolve reports while non-admin is rejected', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const admin = await createAdmin();
    const product = await createProduct(seller);

    await api()
      .post('/api/safety/reports')
      .set('Authorization', authHeader(buyer))
      .send({ targetType: 'product', targetId: product._id, reason: 'scam' })
      .expect(201);

    const report = await Report.findOne({ targetId: product._id });
    await api().get('/api/admin/moderation/reports').set('Authorization', authHeader(buyer)).expect(403);

    await api()
      .patch(`/api/admin/moderation/reports/${report._id}/resolve`)
      .set('Authorization', authHeader(admin))
      .send({ action: 'hide_content', status: 'resolved', note: 'QA hide' })
      .expect(200);

    const [updatedProduct, action] = await Promise.all([
      Product.findById(product._id).lean(),
      ModerationAction.findOne({ reportId: report._id }).lean()
    ]);

    expect(updatedProduct.status).toBe('inactive');
    expect(action.action).toBe('hide_content');
  });
});
