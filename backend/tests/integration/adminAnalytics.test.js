const AnalyticsEvent = require('../../src/modules/analytics/analyticsEvent.model');
const Refund = require('../../src/modules/refunds/refund.model');
const ReturnRequest = require('../../src/modules/returns/return.model');
const SellerPayout = require('../../src/modules/finance/sellerPayout.model');
const SupportRequest = require('../../src/modules/contact/supportRequest.model');
const Report = require('../../src/modules/safety/report.model');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createAdmin, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct, createReel } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');

describe('admin analytics API', () => {
  test('overview is admin-only and returns backend-calculated finance metrics', async () => {
    const admin = await createAdmin();
    const buyer = await createBuyer();
    const seller = await createSeller({ storeName: 'Analytics Seller Store' });
    const product = await createProduct(seller, {
      title: 'Analytics Tote',
      price: 500,
      stock: 2,
      lowStockThreshold: 3
    });
    const reel = await createReel(seller, [product], {
      caption: 'Analytics reel',
      viewCount: 25,
      likeCount: 4,
      commentCount: 2
    });

    const paidOrder = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        orderNumber: 'NW-ANALYTICS-PAID',
        paymentMethod: 'card',
        paymentStatus: 'paid',
        orderStatus: 'delivered',
        shipping: 50,
        totalPlatformCommission: 50,
        totalSellerEarnings: 450
      }
    });
    paidOrder.items[0].platformCommissionAmount = 50;
    paidOrder.items[0].sellerEarningsAmount = 450;
    await paidOrder.save();

    await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        orderNumber: 'NW-ANALYTICS-FAILED',
        paymentMethod: 'wallet',
        paymentStatus: 'failed',
        orderStatus: 'payment_pending',
        shipping: 25
      }
    });

    await Refund.create({
      orderId: paidOrder._id,
      buyerId: buyer._id,
      sellerId: seller._id,
      amount: 100,
      reason: 'quality',
      status: 'refunded'
    });

    await SellerPayout.create({
      sellerId: seller._id,
      payoutNumber: 'PO-ANALYTICS-PENDING',
      amount: 120,
      status: 'pending'
    });
    await SellerPayout.create({
      sellerId: seller._id,
      payoutNumber: 'PO-ANALYTICS-PAID',
      amount: 220,
      status: 'paid'
    });

    await ReturnRequest.create({
      orderId: paidOrder._id,
      buyerId: buyer._id,
      sellerId: seller._id,
      items: [{
        itemId: paidOrder.items[0]._id,
        productId: product._id,
        titleSnapshot: product.title,
        quantity: 1,
        refundAmount: 100
      }],
      reason: 'damaged',
      status: 'completed',
      refundAmount: 100
    });

    await AnalyticsEvent.create([
      { userId: buyer._id, sellerId: seller._id, storeId: seller.testStore._id, productId: product._id, reelId: reel._id, eventType: 'reel_view' },
      { userId: buyer._id, sellerId: seller._id, storeId: seller.testStore._id, productId: product._id, reelId: reel._id, eventType: 'product_click' },
      { userId: buyer._id, sellerId: seller._id, storeId: seller.testStore._id, productId: product._id, eventType: 'cart_add' },
      { userId: buyer._id, sellerId: seller._id, storeId: seller.testStore._id, productId: product._id, eventType: 'checkout_start' },
      { userId: buyer._id, sellerId: seller._id, storeId: seller.testStore._id, productId: product._id, eventType: 'order_placed' }
    ]);

    await SupportRequest.create({
      name: 'Analytics Support',
      email: 'analytics-support@example.com',
      subject: 'Analytics support',
      message: 'Please review this order'
    });
    await Report.create({
      reporterId: buyer._id,
      targetType: 'product',
      targetId: product._id,
      targetOwnerId: seller._id,
      reason: 'spam'
    });

    await api()
      .get('/api/admin/analytics/overview')
      .set('Authorization', authHeader(buyer))
      .expect(403);

    const overview = await api()
      .get('/api/admin/analytics/overview')
      .set('Authorization', authHeader(admin))
      .expect(200);

    expect(overview.body.data.revenue.grossMerchandiseValue).toBe(550);
    expect(overview.body.data.revenue.productRevenue).toBe(500);
    expect(overview.body.data.revenue.shippingCollected).toBe(50);
    expect(overview.body.data.revenue.refunds).toBe(100);
    expect(overview.body.data.revenue.netSales).toBe(450);
    expect(overview.body.data.revenue.platformCommissionEarned).toBe(50);
    expect(overview.body.data.revenue.pendingPayouts).toBe(120);
    expect(overview.body.data.revenue.paidPayouts).toBe(220);
    expect(overview.body.data.orders.paidOrders).toBe(1);
    expect(overview.body.data.orders.failedOrders).toBe(1);
    expect(overview.body.data.payments.cardAmount).toBe(550);
    expect(overview.body.data.products.lowStockProducts).toBe(1);
    expect(overview.body.data.products.unitsSold).toBe(1);
    expect(overview.body.data.funnel.ordersPlaced).toBe(1);
    expect(overview.body.data.operations.openSupportRequests).toBe(1);
    expect(overview.body.data.operations.pendingReports).toBe(1);
  });

  test('supporting analytics endpoints return dashboard-ready breakdowns', async () => {
    const admin = await createAdmin();
    const buyer = await createBuyer({ email: 'analytics-buyer@example.com' });
    const seller = await createSeller({ storeName: 'Breakdown Seller Store' });
    const product = await createProduct(seller, {
      title: 'Breakdown Shawl',
      category: 'Textiles',
      region: 'Kashmir',
      price: 300,
      stock: 1,
      lowStockThreshold: 2,
      clickCount: 7
    });
    const reel = await createReel(seller, [product], {
      caption: 'Breakdown reel',
      viewCount: 40
    });
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        orderNumber: 'NW-ANALYTICS-BREAKDOWN',
        paymentMethod: 'UPI',
        paymentStatus: 'paid',
        totalPlatformCommission: 30,
        totalSellerEarnings: 270,
        shippingInfo: {
          name: 'Buyer QA',
          email: 'buyer@example.com',
          phone: '9999999999',
          address: '123 QA Street',
          city: 'Srinagar',
          state: 'Jammu and Kashmir',
          postalCode: '190001'
        }
      }
    });
    order.items[0].platformCommissionAmount = 30;
    order.items[0].sellerEarningsAmount = 270;
    await order.save();

    await AnalyticsEvent.create([
      { userId: buyer._id, sellerId: seller._id, storeId: seller.testStore._id, productId: product._id, reelId: reel._id, eventType: 'product_click' },
      { userId: buyer._id, sellerId: seller._id, storeId: seller.testStore._id, productId: product._id, reelId: reel._id, eventType: 'order_placed' }
    ]);
    await Refund.create({
      orderId: order._id,
      buyerId: buyer._id,
      sellerId: seller._id,
      amount: 40,
      reason: 'late_delivery',
      status: 'refunded'
    });
    await ReturnRequest.create({
      orderId: order._id,
      buyerId: buyer._id,
      sellerId: seller._id,
      items: [{
        itemId: order.items[0]._id,
        productId: product._id,
        titleSnapshot: product.title,
        quantity: 1,
        refundAmount: 40
      }],
      reason: 'size_issue',
      refundAmount: 40
    });

    await api()
      .get('/api/admin/analytics/payment-methods')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data[0].method).toBe('UPI');
        expect(res.body.data[0].amount).toBe(399);
      });

    await api()
      .get('/api/admin/analytics/sales-trend')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data[0].GMV).toBe(399);
        expect(res.body.data[0].refunds).toBe(40);
      });

    await api()
      .get('/api/admin/analytics/products')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.topProductsByRevenue[0].title).toBe('Breakdown Shawl');
        expect(res.body.data.topProductsByClicks[0].clicks).toBe(7);
        expect(res.body.data.lowStockProducts[0].title).toBe('Breakdown Shawl');
      });

    await api()
      .get('/api/admin/analytics/reels')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.topReelsByViews[0].caption).toBe('Breakdown reel');
        expect(res.body.data.topReelsByProductClicks[0].count).toBe(1);
      });

    await api()
      .get('/api/admin/analytics/regions')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.topCities[0].city).toBe('Srinagar');
        expect(res.body.data.topStates[0].state).toBe('Jammu and Kashmir');
        expect(res.body.data.topCategories[0].category).toBe('Textiles');
      });

    await api()
      .get('/api/admin/analytics/refunds-returns')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.refundAmount).toBe(40);
        expect(res.body.data.returnCount).toBe(1);
        expect(res.body.data.topReturnReasons[0].reason).toBe('size_issue');
      });
  });
});
