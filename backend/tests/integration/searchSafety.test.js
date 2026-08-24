const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct, createReel } = require('../helpers/mockData.helper');

describe('search and safety API', () => {
  test('search supports filters and returns empty arrays safely', async () => {
    const seller = await createSeller();
    const product = await createProduct(seller, { title: 'Blue QA Scarf', category: 'Scarves', region: 'Kashmir', price: 350 });
    await createReel(seller, [product], { category: 'Scarves', region: 'Kashmir' });

    const global = await api().get('/api/search/global?q=Blue').expect(200);
    expect(global.body.data.products.length).toBeGreaterThanOrEqual(1);

    const filtered = await api().get('/api/search/products?category=Scarves&region=Kashmir&minPrice=300&maxPrice=400').expect(200);
    expect(filtered.body.data[0].title).toBe('Blue QA Scarf');

    const empty = await api().get('/api/search/global?q=NoSuchThing').expect(200);
    expect(Array.isArray(empty.body.data.products)).toBe(true);
    expect(Array.isArray(empty.body.data.stores)).toBe(true);
    expect(Array.isArray(empty.body.data.reels)).toBe(true);
  });

  test('search returns total count alongside product results', async () => {
    const seller = await createSeller();
    await createProduct(seller, { title: 'Counted Search Product One', category: 'Sarees', price: 820 });
    await createProduct(seller, { title: 'Counted Search Product Two', category: 'Sarees', price: 930 });

    const response = await api().get('/api/search/products?q=Counted').expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(response.body.meta).toBeTruthy();
    expect(response.body.meta.totalCount).toBeGreaterThanOrEqual(2);
    expect(response.body.meta.returnedCount).toBe(response.body.data.length);
  });

  test('blocked sellers are hidden from authenticated search', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { title: 'Blocked QA Product' });

    await api().get('/api/search/products?q=Blocked').expect(200).expect((res) => {
      expect(res.body.data.some((item) => item._id === product._id.toString())).toBe(true);
    });

    await api().post(`/api/safety/blocks/${seller._id}`).set('Authorization', authHeader(buyer)).expect(200);

    await api().get('/api/search/products?q=Blocked').set('Authorization', authHeader(buyer)).expect(200).expect((res) => {
      expect(res.body.data.some((item) => item._id === product._id.toString())).toBe(false);
    });
  });

  test('catalogue search is rate-limited per authenticated user, not only per IP', async () => {
    const [buyerOne, buyerTwo] = await Promise.all([
      createBuyer({ email: 'search-limit-one@example.com' }),
      createBuyer({ email: 'search-limit-two@example.com' })
    ]);

    for (let index = 0; index < 30; index += 1) {
      await api()
        .get('/api/search/products?q=rate-limit')
        .set('Authorization', authHeader(buyerOne))
        .expect(200);
    }

    await api()
      .get('/api/search/products?q=rate-limit')
      .set('Authorization', authHeader(buyerOne))
      .expect(429);

    await api()
      .get('/api/search/products?q=rate-limit')
      .set('Authorization', authHeader(buyerTwo))
      .expect(200);
  });
});
