const financeService = require('../../src/modules/finance/finance.service');
const { calculateCommission } = require('../../src/config/commissionConfig');
const SellerEarning = require('../../src/modules/finance/sellerEarning.model');
const CommissionSetting = require('../../src/modules/finance/commissionSetting.model');
const { createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');

describe('commission and seller earnings service', () => {
  test('calculates platform commission from product subtotal only', () => {
    const commission = calculateCommission(1000, 12.5);

    expect(commission.commissionAmount).toBe(125);
    expect(commission.sellerPayoutAmount).toBe(875);
    expect(commission.commissionPercentage).toBe(12.5);
  });

  test('uses seller-specific commission override when annotating order items', async () => {
    const seller = await createSeller();
    await CommissionSetting.create({
      globalCommissionPercentage: 10,
      sellerOverrides: [{ sellerId: seller._id, commissionPercentage: 7 }]
    });

    const [item] = await financeService.applyFinancialsToOrderItems([{
      sellerId: seller._id,
      quantity: 2,
      priceSnapshot: 500,
      itemTotal: 1000
    }]);

    expect(item.commissionPercentage).toBe(7);
    expect(item.platformCommissionAmount).toBe(70);
    expect(item.sellerEarningsAmount).toBe(930);
  });

  test('creates pending earning rows and preserves quantity for top product analytics', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { price: 300, stock: 5 });
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        quantity: 3,
        totalPlatformCommission: 90,
        totalSellerEarnings: 810
      }
    });

    order.items[0].commissionPercentage = 10;
    order.items[0].platformCommissionAmount = 90;
    order.items[0].sellerEarningsAmount = 810;
    await order.save();

    await financeService.createEarningsForOrder(order);

    const earning = await SellerEarning.findOne({ orderId: order._id }).lean();
    expect(earning.payoutStatus).toBe('pending');
    expect(earning.quantity).toBe(3);
    expect(earning.grossAmount).toBe(900);
    expect(earning.commissionAmount).toBe(90);
    expect(earning.netEarnings).toBe(810);

    const topProducts = await financeService.topProductsForSeller(seller._id);
    expect(topProducts[0].unitsSold).toBe(3);
  });
});
