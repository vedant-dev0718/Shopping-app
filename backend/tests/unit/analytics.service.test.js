const analyticsService = require('../../src/modules/analytics/analytics.service');
const AnalyticsEvent = require('../../src/modules/analytics/analyticsEvent.model');
const { createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct, createReel } = require('../helpers/mockData.helper');

describe('analytics service', () => {
  test('trackEventSafe records valid analytics events without throwing', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller);
    const reel = await createReel(seller, [product]);

    await analyticsService.trackEventSafe({
      userId: buyer._id,
      sellerId: seller._id,
      storeId: seller.testStore._id,
      productId: product._id,
      reelId: reel._id,
      eventType: 'product_click'
    });

    const event = await AnalyticsEvent.findOne({ eventType: 'product_click' }).lean();
    expect(event.sellerId.toString()).toBe(seller._id.toString());
  });

  test('summary handles zero data without division errors', async () => {
    const seller = await createSeller();
    const summary = await analyticsService.getSummary(seller._id);

    expect(summary.reelViews).toBe(0);
    expect(summary.productClicks).toBe(0);
    expect(summary.mockOrders).toBe(0);
  });
});
