const Order = require('../modules/orders/order.model');
const ReturnRequest = require('../modules/returns/return.model');
const financeService = require('../modules/finance/finance.service');

const OPEN_RETURN_STATUSES = ['requested', 'approved', 'in_transit', 'received'];

const runEarningsEligibility = async () => {
  const orders = await Order.find({
    paymentStatus: 'paid',
    'deliveryInfo.deliveredAt': { $ne: null },
    'deliveryInfo.returnWindowEndsAt': { $ne: null, $lte: new Date() },
    'items.payoutStatus': 'pending'
  });

  const summary = { processed: 0, skippedOpenReturns: 0, errors: 0 };

  for (const order of orders) {
    try {
      const openReturns = await ReturnRequest.countDocuments({
        orderId: order._id,
        status: { $in: OPEN_RETURN_STATUSES }
      });

      if (openReturns > 0) {
        summary.skippedOpenReturns += 1;
        continue;
      }

      await financeService.markOrderEarningsEligible(order, order.deliveryInfo.deliveredAt);

      await order.save();
      summary.processed += 1;
      console.log(`Marked earnings eligible for order ${order.orderNumber}`);
    } catch (error) {
      summary.errors += 1;
      console.error(`Earnings eligibility failed for order ${order._id}:`, error.message);
    }
  }

  return summary;
};

module.exports = { runEarningsEligibility };
