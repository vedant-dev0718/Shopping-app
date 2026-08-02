const mongoose = require('mongoose');

const sellerEarningSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  orderItemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    min: 1,
    default: 1
  },
  grossAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  commissionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  commissionAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  netEarnings: {
    type: Number,
    default: 0
  },
  refundAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  payoutStatus: {
    type: String,
    enum: ['pending', 'eligible', 'paid', 'held', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  eligibilityDate: {
    type: Date,
    default: null,
    index: true
  },
  paidAt: {
    type: Date,
    default: null
  },
  payoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SellerPayout',
    default: null,
    index: true
  }
}, {
  timestamps: true
});

sellerEarningSchema.index({ orderId: 1, orderItemId: 1 }, { unique: true });

module.exports = mongoose.model('SellerEarning', sellerEarningSchema);
