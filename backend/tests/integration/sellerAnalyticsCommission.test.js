const SellerEarning = require('../../src/modules/finance/sellerEarning.model');
const financeService = require('../../src/modules/finance/finance.service');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createAdmin, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');

describe('seller analytics, commission, and payout APIs', () => {
  test('seller analytics exposes commission, earnings, zero-safe metrics, and payouts', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { price: 1000, stock: 2 });
    const order = await createOrder({ buyer, seller, product, overrides: { totalPlatformCommission: 100, totalSellerEarnings: 900 } });
    order.items[0].commissionPercentage = 10;
    order.items[0].platformCommissionAmount = 100;
    order.items[0].sellerEarningsAmount = 900;
    await order.save();
    await financeService.createEarningsForOrder(order);

    const overview = await api().get('/api/seller/analytics/overview').set('Authorization', authHeader(seller)).expect(200);
    expect(overview.body.data.grossSales).toBe(1000);
    expect(overview.body.data.platformCommission).toBe(100);
    expect(overview.body.data.returnRate).toBe(0);

    const payouts = await api().get('/api/seller/analytics/payouts').set('Authorization', authHeader(seller)).expect(200);
    expect(payouts.body.data.pendingEarnings).toBe(900);

    const products = await api().get('/api/seller/analytics/products').set('Authorization', authHeader(seller)).expect(200);
    expect(products.body.data[0].title).toBe(product.title);
  });

  test('admin can view platform analytics and update commission settings', async () => {
    const admin = await createAdmin();
    const seller = await createSeller();
    await SellerEarning.create({
      sellerId: seller._id,
      orderId: seller._id,
      orderItemId: seller._id,
      productId: seller._id,
      storeId: seller.testStore._id,
      grossAmount: 500,
      commissionPercentage: 10,
      commissionAmount: 50,
      netEarnings: 450
    });

    await api()
      .patch('/api/admin/commission-settings')
      .set('Authorization', authHeader(admin))
      .send({ globalCommissionPercentage: 12, sellerOverrides: [{ sellerId: seller._id, commissionPercentage: 8 }] })
      .expect(200);

    const platform = await api().get('/api/admin/analytics/platform').set('Authorization', authHeader(admin)).expect(200);
    expect(platform.body.data.totalGMV).toBeGreaterThanOrEqual(500);

    await api().patch('/api/admin/commission-settings').set('Authorization', authHeader(admin)).send({ globalCommissionPercentage: -1 }).expect(400);
  });
});
