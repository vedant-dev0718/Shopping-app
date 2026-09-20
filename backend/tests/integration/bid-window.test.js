const Bid = require('../../src/modules/bargain/bid.model');
const BargainSchedule = require('../../src/modules/bargain/bargainSchedule.model');
const Product = require('../../src/modules/products/product.model');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');

const createFixture = async () => {
  const buyer = await createBuyer();
  const seller = await createSeller();
  const product = await createProduct(seller, { price: 1000, stock: 3, bargainEnabled: true });
  const schedule = await BargainSchedule.create({
    productId: product._id,
    sellerId: seller._id,
    startDate: new Date(Date.now() - 60000),
    endDate: new Date(Date.now() + 3600000),
    status: 'active'
  });
  const bid = await Bid.create({
    productId: product._id,
    buyerId: buyer._id,
    sellerId: seller._id,
    amount: 800,
    bidStatus: 'pending_seller_decision',
    paymentStatus: 'not_required'
  });
  return { buyer, seller, product, schedule, bid };
};

const readBidLists = async ({ buyer, seller, product }) => {
  const buyerResponse = await api().get('/api/bargain/my-bids')
    .set('Authorization', authHeader(buyer)).expect(200);
  const sellerResponse = await api().get(`/api/bargain/products/${product._id}/bids`)
    .set('Authorization', authHeader(seller)).expect(200);
  return [buyerResponse.body.data, sellerResponse.body.data];
};

describe('bid payment window visibility', () => {
  test('closing an accepted window persists expiry for both roles and removes it from live summary', async () => {
    const fixture = await createFixture();
    const { buyer, seller, product, bid, schedule } = fixture;
    const bidPath = `/api/bargain/products/${product._id}/bids/${bid._id}`;

    await api().post(`${bidPath}/accept`)
      .set('Authorization', authHeader(seller)).send({}).expect(200);
    for (const bids of await readBidLists(fixture)) {
      expect(bids[0].bidStatus).toBe('accepted');
      expect(bids[0].canProceedToPayment).toBe(true);
    }

    const response = await api().post(`${bidPath}/close-window`)
      .set('Authorization', authHeader(seller)).send({}).expect(200);
    expect(response.body.data.bidStatus).toBe('expired');

    // The closed payment window also closes the Bargain Day for both roles.
    for (const bids of await readBidLists(fixture)) {
      expect(bids).toHaveLength(1);
      expect(bids[0].bidStatus).toBe('expired');
      expect(bids[0].paymentStatus).toBe('cancelled');
      expect(bids[0].canProceedToPayment).toBe(false);
    }
    expect((await Bid.findById(bid._id)).bidStatus).toBe('expired');
    const closedSchedule = await BargainSchedule.findById(schedule._id);
    expect(closedSchedule.status).toBe('closed');
    expect(closedSchedule.winningBidId).toBeNull();
    expect((await Product.findById(product._id)).bargainEnabled).toBe(false);

    const summary = await api().get(`/api/bargain/products/${product._id}/bids/summary`)
      .set('Authorization', authHeader(buyer)).expect(200);
    expect(summary.body.data.totalBids).toBe(0);
    expect(summary.body.data.highestBidAmount).toBeNull();
    expect(summary.body.data.recentBids).toEqual([]);

    await api().post('/api/cart/items').set('Authorization', authHeader(buyer))
      .send({ productId: product.id, bargainBidId: bid.id, quantity: 1 }).expect(404);
    await api().post(`${bidPath}/accept`)
      .set('Authorization', authHeader(seller)).send({}).expect(404);
  });

  test.each(['active', 'pending_seller_decision', 'accepted', 'won'])('elapsed %s windows are expired and not payable in both fresh lists', async (status) => {
    const fixture = await createFixture();
    fixture.bid.bidStatus = status;
    fixture.bid.paymentWindowEndsAt = new Date(Date.now() - 1000);
    await fixture.bid.save();

    for (const bids of await readBidLists(fixture)) {
      expect(bids[0].bidStatus).toBe('expired');
      expect(bids[0].paymentWindowEndsAt).toBe(fixture.bid.paymentWindowEndsAt.toISOString());
      expect(bids[0].canProceedToPayment).toBe(false);
    }
    const summary = await api().get(`/api/bargain/products/${fixture.product._id}/bids/summary`)
      .set('Authorization', authHeader(fixture.buyer)).expect(200);
    expect(summary.body.data.totalBids).toBe(0);
  });

  test.each(['paid', 'linked'])('does not expire a %s winning bid with an elapsed deadline', async (completion) => {
    const fixture = await createFixture();
    fixture.bid.bidStatus = 'won';
    fixture.bid.paymentWindowEndsAt = new Date(Date.now() - 1000);
    if (completion === 'paid') {
      fixture.bid.paymentStatus = 'paid';
    } else {
      const order = await createOrder(fixture);
      fixture.bid.orderId = order._id;
    }
    await fixture.bid.save();

    for (const bids of await readBidLists(fixture)) {
      expect(bids[0].bidStatus).toBe('won');
      expect(bids[0].canProceedToPayment).toBe(false);
    }
  });

  test('future accepted windows retain matching timing and payment eligibility for both roles', async () => {
    const fixture = await createFixture();
    fixture.bid.bidStatus = 'accepted';
    fixture.bid.paymentWindowEndsAt = new Date(Date.now() + 3600000);
    await fixture.bid.save();

    for (const bids of await readBidLists(fixture)) {
      expect(bids[0].bidStatus).toBe('accepted');
      expect(bids[0].paymentWindowEndsAt).toBe(fixture.bid.paymentWindowEndsAt.toISOString());
      expect(bids[0].canProceedToPayment).toBe(true);
    }
  });

  test('reopening negotiation clears the old deadline without reviving seller-cancelled bids', async () => {
    const fixture = await createFixture();
    const { seller, product, bid } = fixture;
    bid.bidStatus = 'accepted';
    bid.paymentWindowEndsAt = new Date(Date.now() - 1000);
    await bid.save();
    const bidPath = `/api/bargain/products/${product._id}/bids/${bid._id}`;

    await api().post(`${bidPath}/reopen-negotiation`)
      .set('Authorization', authHeader(seller)).send({}).expect(200);
    for (const bids of await readBidLists(fixture)) {
      expect(bids[0].bidStatus).toBe('pending_seller_decision');
      expect(bids[0].paymentWindowEndsAt).toBeNull();
    }
    await api().post(`${bidPath}/accept`)
      .set('Authorization', authHeader(seller)).send({}).expect(200);
    await api().post(`${bidPath}/close-window`)
      .set('Authorization', authHeader(seller)).send({}).expect(200);
    await api().post(`${bidPath}/reopen-negotiation`)
      .set('Authorization', authHeader(seller)).send({}).expect(400);
    expect((await Bid.findById(bid._id)).bidStatus).toBe('expired');
  });

  test('revising a pending bid clears the previous payment deadline', async () => {
    const fixture = await createFixture();
    const { buyer, product, bid } = fixture;
    bid.paymentWindowEndsAt = new Date(Date.now() - 1000);
    await bid.save();
    await api().post(`/api/bargain/products/${product._id}/bids`)
      .set('Authorization', authHeader(buyer))
      .send({
        amount: 850,
        quantity: 1,
        shippingInfo: {
          name: 'Bid Buyer',
          email: buyer.email,
          phone: '9999999999',
          address: '42 Bid Street',
          city: 'Jaipur',
          state: 'Rajasthan',
          postalCode: '302001'
        }
      }).expect(201);
    for (const bids of await readBidLists(fixture)) {
      expect(bids[0].bidStatus).toBe('pending_seller_decision');
      expect(bids[0].amount).toBe(850);
      expect(bids[0].paymentWindowEndsAt).toBeNull();
    }
  });

  test('live summary ignores terminal bids even when they have higher amounts', async () => {
    const fixture = await createFixture();
    const { buyer, seller, product } = fixture;
    await Bid.insertMany(['expired', 'rejected', 'lost', 'withdrawn', 'cancelled', 'draft'].map((bidStatus) => ({
      productId: product._id,
      buyerId: buyer._id,
      sellerId: seller._id,
      amount: 950,
      bidStatus,
      paymentStatus: 'not_required'
    })));

    const response = await api().get(`/api/bargain/products/${product._id}/bids/summary`)
      .set('Authorization', authHeader(buyer)).expect(200);
    expect(response.body.data.totalBids).toBe(1);
    expect(response.body.data.highestBidAmount).toBe(800);
    expect(response.body.data.recentBids).toHaveLength(1);
    expect(response.body.data.recentBids[0].status).toBe('pending_seller_decision');
  });
});
