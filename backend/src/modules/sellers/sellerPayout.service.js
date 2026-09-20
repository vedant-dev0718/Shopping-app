const Order = require('../orders/order.model');
const { toSellerOrderView } = require('../sellerOrders/sellerOrder.service');

const roundMoney = (value) => Math.round(value * 100) / 100;

const getSellerEarnings = async (sellerId) => {
  const orders = await Order.find({
    'items.sellerId': sellerId,
    paymentStatus: 'paid'
  }).lean();

  const totals = orders.reduce((summary, order) => {
    const sellerOrder = toSellerOrderView(order, sellerId);
    const commissionRate = order.commissionRate || 0;
    const commission = sellerOrder.sellerSubtotal * commissionRate;
    const earned = sellerOrder.sellerSubtotal * (1 - commissionRate);

    summary.totalSold += sellerOrder.sellerSubtotal;
    summary.totalCommissionPaid += commission;
    summary.totalEarned += earned;

    if (order.payoutStatus === 'released') {
      summary.released += earned;
    } else {
      summary.onHold += earned;
    }

    return summary;
  }, {
    totalSold: 0,
    totalCommissionPaid: 0,
    totalEarned: 0,
    onHold: 0,
    released: 0,
    orderCount: orders.length
  });

  return {
    totalSold: roundMoney(totals.totalSold),
    totalCommissionPaid: roundMoney(totals.totalCommissionPaid),
    totalEarned: roundMoney(totals.totalEarned),
    onHold: roundMoney(totals.onHold),
    released: roundMoney(totals.released),
    orderCount: totals.orderCount
  };
};

module.exports = {
  getSellerEarnings
};
