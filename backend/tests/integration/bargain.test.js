const Order = require('../../src/modules/orders/order.model');
const BargainSchedule = require('../../src/modules/bargain/bargainSchedule.model');
const bargainService = require('../../src/modules/bargain/bargain.service');
const { createBuyer, createSeller } = require('../helpers/auth.helper');
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
