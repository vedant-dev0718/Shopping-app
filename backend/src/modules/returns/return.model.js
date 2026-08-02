const mongoose = require('mongoose');

const returnRequestSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  items: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    titleSnapshot: {
      type: String,
      trim: true,
      default: ''
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1
    },
    refundAmount: {
      type: Number,
      min: 0,
      default: 0
    }
  }],
  reason: {
    type: String,
    trim: true,
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  imageUrls: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['requested', 'approved', 'rejected', 'in_transit', 'received', 'completed'],
    default: 'requested',
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: ''
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refundStatus: {
    type: String,
    enum: ['pending', 'initiated', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  returnReceivedAt: {
    type: Date,
    default: null
  }
});

returnRequestSchema.index(
  { orderId: 1, itemId: 1 },
  { unique: true, partialFilterExpression: { itemId: { $exists: true } } }
);
returnRequestSchema.index({ orderId: 1, status: 1 });

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
