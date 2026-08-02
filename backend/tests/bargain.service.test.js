const bargainService = require('../src/modules/bargain/bargain.service');
const Bid = require('../src/modules/bargain/bid.model');
const BargainSchedule = require('../src/modules/bargain/bargainSchedule.model');
const Order = require('../src/modules/orders/order.model');
const Product = require('../src/modules/products/product.model');
const Store = require('../src/modules/stores/store.model');
const User = require('../src/modules/users/user.model');
const { razorpay } = require('../src/utils/razorpay');

const createUser = (role, email) => User.create({
  name: `${role} user`,
  email,
  role,
  accountStatus: 'active',
  isEmailVerified: true
});

const createBargainFixture = async () => {
  const [buyer, seller] = await Promise.all([
    createUser('buyer', 'buyer@example.com'),
    createUser('seller', 'seller@example.com')
  ]);
  const store = await Store.create({
    sellerId: seller._id,
    storeName: 'Test Store',
    category: 'Craft',
    city: 'Mumbai',
    state: 'Maharashtra',
    region: 'West',
    description: 'Test store'
  });
  const product = await Product.create({
    sellerId: seller._id,
    storeId: store._id,
    title: 'Bargain Tote',
    description: 'Test bargain product',
    category: 'Bags',
    region: 'West',
    price: 1200,
    stock: 1,
    status: 'active',
    imageUrls: ['https://example.com/tote.jpg']
  });
  await BargainSchedule.create({
    productId: product._id,
    sellerId: seller._id,
    startDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 60 * 1000),
    status: 'active'
  });
  const bid = await Bid.create({
    productId: product._id,
    buyerId: buyer._id,
    sellerId: seller._id,
    amount: 900,
    shippingInfo: {
      name: 'Buyer One',
      email: 'buyer@example.com',
      phone: '9999999999',
      address: '123 Market Lane',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001'
    },
    razorpayOrderId: 'dev_bid_order_123',
    razorpayPaymentId: 'dev_bid_payment_123',
    paymentStatus: 'authorized',
    bidStatus: 'pending_seller_decision',
    razorpay: {
      orderId: 'dev_bid_order_123',
      paymentId: 'dev_bid_payment_123',
      authorizedAt: new Date()
    }
  });

  return { buyer, seller, product, bid };
};

describe('bargainService.closeBargain', () => {
  it('creates and links an order for the winning bid before reducing stock', async () => {
    const { buyer, seller, product, bid } = await createBargainFixture();
    const losingBuyer = await createUser('buyer', 'losing-buyer@example.com');
    const losingBid = await Bid.create({
      productId: product._id,
      buyerId: losingBuyer._id,
      sellerId: seller._id,
      amount: 700,
      shippingInfo: {
        name: 'Buyer Two',
        email: 'losing-buyer@example.com',
        phone: '9999999998',
        address: '456 Market Lane',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001'
      },
      razorpayOrderId: 'dev_losing_bid_order_123',
      razorpayPaymentId: 'dev_losing_bid_payment_123',
      paymentStatus: 'authorized',
      bidStatus: 'pending_seller_decision',
      razorpay: {
        orderId: 'dev_losing_bid_order_123',
        paymentId: 'dev_losing_bid_payment_123',
        authorizedAt: new Date()
      }
    });

    const result = await bargainService.closeBargain({ id: seller._id }, product._id);

    expect(result.order).toBeTruthy();
    expect(result.order.buyerId.toString()).toBe(buyer._id.toString());
    expect(result.order.items).toHaveLength(1);
    expect(result.order.items[0].productId.toString()).toBe(product._id.toString());
    expect(result.order.finalTotal).toBe(900);
    expect(result.order.paymentStatus).toBe('paid');
    expect(result.order.razorpayPaymentId).toBe('dev_bid_payment_123');

    const [persistedBid, persistedLosingBid, persistedOrder, persistedProduct] = await Promise.all([
      Bid.findById(bid._id),
      Bid.findById(losingBid._id),
      Order.findById(result.order._id),
      Product.findById(product._id)
    ]);

    expect(persistedOrder).toBeTruthy();
    expect(persistedOrder.emailSent).toBe(true);
    expect(persistedBid.orderId.toString()).toBe(persistedOrder._id.toString());
    expect(persistedBid.bidStatus).toBe('won');
    expect(persistedBid.paymentStatus).toBe('captured');
    expect(persistedLosingBid.bidStatus).toBe('lost');
    expect(persistedLosingBid.paymentStatus).toBe('authorized');
    expect(persistedProduct.stock).toBe(0);
    expect(persistedProduct.status).toBe('sold_out');
  });

  it('does not confirm the winning bid order when the captured amount mismatches the order total', async () => {
    const { seller, product, bid } = await createBargainFixture();

    bid.razorpayPaymentId = 'pay_underpaid_bid_123';
    bid.razorpay.paymentId = 'pay_underpaid_bid_123';
    await bid.save();

    razorpay.payments.fetch.mockResolvedValueOnce({
      id: 'pay_underpaid_bid_123',
      order_id: 'dev_bid_order_123',
      status: 'captured',
      amount: 80000,
      currency: 'INR',
      method: 'card'
    });

    await expect(
      bargainService.closeBargain({ id: seller._id }, product._id)
    ).rejects.toThrow('Captured payment amount mismatch');

    const persistedBid = await Bid.findById(bid._id);
    const persistedOrder = await Order.findById(persistedBid.orderId);
    const persistedProduct = await Product.findById(product._id);

    expect(persistedOrder).toBeTruthy();
    expect(persistedOrder.finalTotal).toBe(900);
    expect(persistedOrder.paymentStatus).toBe('capture_failed');
    expect(persistedOrder.paymentFlow.captureFailureReason).toContain('expected 90000 paise but received 80000 paise');
    expect(persistedBid.bidStatus).toBe('pending_seller_decision');
    expect(persistedProduct.stock).toBe(1);
    expect(persistedProduct.status).toBe('active');
  });
});
