const Reel = require('../../src/modules/reels/reel.model');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');

describe('reels API', () => {
  test('seller creates shoppable reel and buyer can view, like once, unlike, comment, and record view', async () => {
    const seller = await createSeller();
    const buyer = await createBuyer();
    const product = await createProduct(seller);

    const created = await api()
      .post('/api/seller/reels')
      .set('Authorization', authHeader(seller))
      .send({
        videoUrl: 'https://example.com/reel.mp4',
        thumbnailUrl: 'https://example.com/reel.jpg',
        caption: 'QA reel',
        region: 'Rajasthan',
        category: 'Bags',
        taggedProductIds: [product._id]
      })
      .expect(201);

    expect(created.body.data.storeId?.storeName).toBeTruthy();
    expect(created.body.data.taggedProductIds?.[0]?.title).toBe(product.title);

    const reelId = created.body.data._id;
    await api()
      .get('/api/seller/reels')
      .set('Authorization', authHeader(seller))
      .expect(200)
      .expect((res) => {
        expect(res.body.data[0].storeId?.storeName).toBeTruthy();
        expect(res.body.data[0].taggedProductIds?.[0]?.title).toBe(product.title);
      });

    await api().get('/api/reels').expect(200).expect((res) => {
      expect(res.body.data[0].storeId).toBeTruthy();
      expect(res.body.data[0].taggedProducts || res.body.data[0].taggedProductIds).toBeTruthy();
    });

    await api().post(`/api/reels/${reelId}/view`).set('Authorization', authHeader(buyer)).expect(200);
    await api().post(`/api/reels/${reelId}/like`).set('Authorization', authHeader(buyer)).expect(200);
    await api().post(`/api/reels/${reelId}/like`).set('Authorization', authHeader(buyer)).expect(200);
    await api().delete(`/api/reels/${reelId}/like`).set('Authorization', authHeader(buyer)).expect(200);
    await api().post(`/api/reels/${reelId}/comments`).set('Authorization', authHeader(buyer)).send({ text: 'Nice reel' }).expect(201);

    const reel = await Reel.findById(reelId).lean();
    expect(reel.viewCount).toBe(1);
    expect(reel.likeCount).toBe(0);
    expect(reel.commentCount).toBe(1);
  });

  test('reel validation rejects missing video and another seller product tags', async () => {
    const seller = await createSeller();
    const otherSeller = await createSeller({ email: 'other-reel-seller@example.com' });
    const otherProduct = await createProduct(otherSeller);

    await api()
      .post('/api/seller/reels')
      .set('Authorization', authHeader(seller))
      .send({
        thumbnailUrl: 'https://example.com/reel.jpg',
        region: 'Rajasthan',
        category: 'Bags',
        taggedProductIds: [otherProduct._id]
      })
      .expect(400);
  });
});
