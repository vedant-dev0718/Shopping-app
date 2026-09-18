const mongoose = require('mongoose');

const bargainScheduleSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reservePrice: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'cancelled'],
    default: 'active',
    index: true
  },
  winningBidId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid',
    default: null
  }
});

bargainScheduleSchema.index({ productId: 1, status: 1 });

// Ensure ObjectIds are properly serialized to strings
bargainScheduleSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    ret.productId = ret.productId.toString();
    ret.sellerId = ret.sellerId.toString();
    if (ret.winningBidId) ret.winningBidId = ret.winningBidId.toString();
    return ret;
  }
});

module.exports = mongoose.model('BargainSchedule', bargainScheduleSchema);
