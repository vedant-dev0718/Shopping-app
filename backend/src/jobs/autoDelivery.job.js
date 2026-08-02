const Order = require('../modules/orders/order.model');

const AUTO_DELIVERY_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const runAutoDelivery = async () => {
  const cutoff = new Date(Date.now() - AUTO_DELIVERY_DAYS * DAY_MS);

  const orders = await Order.find({
    orderStatus: 'shipped',
    shippedAt: { $lte: cutoff },
    'deliveryInfo.deliveryReviewRequired': { $ne: true }
  });

  const summary = { flaggedForReview: 0, errors: 0 };

  for (const order of orders) {
    try {
      order.deliveryInfo = order.deliveryInfo || {};
      order.deliveryInfo.deliveryReviewRequired = true;
      order.deliveryInfo.deliveryConfirmationStatus = 'review_required';
      order.deliveryInfo.deliveryReviewReason = `No courier delivered webhook received within ${AUTO_DELIVERY_DAYS} days of shipment`;
      order.deliveryInfo.deliveryReviewFlaggedAt = new Date();
      order.deliveryInfo.lastCourierStatus = order.deliveryInfo.lastCourierStatus || order.trackingStatus || 'Shipped';
      order.deliveryInfo.lastCourierStatusAt = order.deliveryInfo.lastCourierStatusAt || new Date();
      order.trackingStatus = 'Delivery confirmation pending - review required';
      await order.save();
      summary.flaggedForReview += 1;
      console.log(`Flagged shipped order ${order.orderNumber} for delivery review`);
    } catch (error) {
      summary.errors += 1;
      console.error(`Failed to flag order ${order._id} for delivery review:`, error.message);
    }
  }

  return summary;
};

module.exports = { runAutoDelivery };
