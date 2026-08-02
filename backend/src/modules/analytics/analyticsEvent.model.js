const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
    index: true
  },
  reelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reel',
    default: null,
    index: true
  },
  eventType: {
    type: String,
    enum: [
      'reel_view',
      'product_click',
      'product_save',
      'store_view',
      'store_save',
      'cart_add',
      'checkout_start',
      'order_placed',
      'order_cancel_requested',
      'order_cancelled',
      'order_cancel_rejected',
      'return_requested',
      'return_approved',
      'return_rejected',
      'return_received',
      'refund_requested',
      'refund_processed',
      'refund_failed',
      'stock_restored',
      'order_awaiting_seller_acceptance',
      'order_seller_accepted',
      'order_seller_rejected',
      'order_acceptance_expired',
      'refund_triggered_due_to_unavailable',
      'stock_unavailable_after_order',
      'comment_added',
      'reel_like'
    ],
    required: true,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

analyticsEventSchema.index({ sellerId: 1, eventType: 1, createdAt: -1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
