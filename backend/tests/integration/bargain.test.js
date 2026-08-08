const Bid = require('../../src/modules/bargain/bid.model');
const Order = require('../../src/modules/orders/order.model');
const BargainSchedule = require('../../src/modules/bargain/bargainSchedule.model');
const bargainService = require('../../src/modules/bargain/bargain.service');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');

const shippingInfo = {
  name: 'Bid Buyer',
  email: 'bid-buyer@example.com',
  phone: '9999999999',
  address: '42 Bid Street',
  city: 'Jaipur',
  state: 'Rajasthan',
  postalCode: '302001'
};

const activeScheduleWindow = () => ({
  startDate: new Date(Date.now() - 60 * 1000),
  endDate: new Date(Date.now() + 60 * 60 * 1000)
});

describe('bargain bid checkout flow', () => {
  test('closing a bargain captures the winning bid and creates an order with shipping info', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { price: 1000, stock: 2 });

    await BargainSchedule.create({
      productId: product._id,
      sellerId: seller._id,
      startDate: new Date(Date.now() - 60 * 1000),
      endDate: new Date(Date.now() + 60 * 60 * 1000),
      status: 'active'
    });

    const bid = await bargainService.placeBid(buyer, product._id, {
      amount: 750,
      shippingInfo
    });

    expect(bid.paymentStatus).toBe('authorized');
    expect(bid.shippingInfo.city).toBe('Jaipur');

    const result = await bargainService.closeBargain(seller, product._id, { force: true });

    expect(result.winningBid.paymentStatus).toBe('captured');
    expect(result.order).toBeTruthy();
    expect(result.order.orderStatus).toBe('processing');
    expect(result.order.paymentStatus).toBe('paid');
    expect(result.order.shippingInfo.email).toBe(shippingInfo.email);
    expect(result.order.finalTotal).toBe(750);

    const persistedOrder = await Order.findById(result.order._id).lean();
    expect(persistedOrder.items[0].priceSnapshot).toBe(750);
    expect(persistedOrder.sellerAcceptance.status).toBe('accepted');
  });
});

describe('seller accept bid endpoint', () => {
  test('accepting a bid marks it accepted, closes schedule, and rejects competing bids', async () => {
    const seller = await createSeller();
    const buyerA = await createBuyer();
    const buyerB = await createBuyer();
    const product = await createProduct(seller, { price: 1000, stock: 3 });
    const window = activeScheduleWindow();

    await BargainSchedule.create({
      productId: product._id,
      sellerId: seller._id,
      startDate: window.startDate,
      endDate: window.endDate,
      reservePrice: 0,
      status: 'active'
    });

    await api()
      .post(`/api/bargain/products/${product._id}/bids`)
      .set('Authorization', authHeader(buyerA))
      .send({ amount: 720, quantity: 2, shippingInfo })
      .expect(201);

    await api()
      .post(`/api/bargain/products/${product._id}/bids`)
      .set('Authorization', authHeader(buyerB))
      .send({ amount: 690, quantity: 1, shippingInfo: { ...shippingInfo, email: 'bid-buyer-2@example.com' } })
      .expect(201);

    const winningCandidate = await Bid.findOne({ productId: product._id, buyerId: buyerA._id });
    const losingCandidate = await Bid.findOne({ productId: product._id, buyerId: buyerB._id });

    const accepted = await api()
      .post(`/api/bargain/products/${product._id}/bids/${winningCandidate._id}/accept`)
      .set('Authorization', authHeader(seller))
      .send({})
      .expect(200);

    expect(accepted.body.data._id.toString()).toBe(winningCandidate._id.toString());
    expect(accepted.body.data.bidStatus).toBe('accepted');

    const [acceptedBid, rejectedBid, schedule] = await Promise.all([
      Bid.findById(winningCandidate._id),
      Bid.findById(losingCandidate._id),
      BargainSchedule.findOne({ productId: product._id })
    ]);

    expect(acceptedBid.bidStatus).toBe('accepted');
    expect(acceptedBid.sellerDecision.decision).toBe('accepted');
    expect(rejectedBid.bidStatus).toBe('rejected');
    expect(rejectedBid.sellerDecision.decision).toBe('rejected');
    expect(schedule.status).toBe('closed');
    expect(schedule.winningBidId.toString()).toBe(winningCandidate._id.toString());
  });

  test('accept bid fails when reserve price is not met', async () => {
    const seller = await createSeller();
    const buyer = await createBuyer();
    const product = await createProduct(seller, { price: 1200, stock: 2 });
    const window = activeScheduleWindow();

    await BargainSchedule.create({
      productId: product._id,
      sellerId: seller._id,
      startDate: window.startDate,
      endDate: window.endDate,
      reservePrice: 900,
      status: 'active'
    });

    await api()
      .post(`/api/bargain/products/${product._id}/bids`)
      .set('Authorization', authHeader(buyer))
      .send({ amount: 820, quantity: 1, shippingInfo })
      .expect(201);

    const bid = await Bid.findOne({ productId: product._id, buyerId: buyer._id });

    const rejected = await api()
      .post(`/api/bargain/products/${product._id}/bids/${bid._id}/accept`)
      .set('Authorization', authHeader(seller))
      .send({})
      .expect(400);

    expect(rejected.body.message).toContain('Cannot accept bid below reserve price');
  });

  test('accept bid fails when payment authorization has expired', async () => {
    const seller = await createSeller();
    const buyer = await createBuyer();
    const product = await createProduct(seller, { price: 1100, stock: 2 });
    const window = activeScheduleWindow();

    await BargainSchedule.create({
      productId: product._id,
      sellerId: seller._id,
      startDate: window.startDate,
      endDate: window.endDate,
      reservePrice: 0,
      status: 'active'
    });

    await api()
      .post(`/api/bargain/products/${product._id}/bids`)
      .set('Authorization', authHeader(buyer))
      .send({ amount: 780, quantity: 1, shippingInfo })
      .expect(201);

    const bid = await Bid.findOne({ productId: product._id, buyerId: buyer._id });
    bid.razorpay = {
      ...(bid.razorpay || {}),
      authorizationExpiresAt: new Date(Date.now() - 60 * 1000)
    };
    await bid.save();

    const rejected = await api()
      .post(`/api/bargain/products/${product._id}/bids/${bid._id}/accept`)
      .set('Authorization', authHeader(seller))
      .send({})
      .expect(409);

    expect(rejected.body.message).toContain('Bid payment authorization has expired');
  });
});
