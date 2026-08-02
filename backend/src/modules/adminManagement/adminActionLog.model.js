const mongoose = require('mongoose');

const adminActionLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  actionType: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  targetType: {
    type: String,
    required: true,
    enum: [
      'user',
      'seller',
      'store',
      'product',
      'reel',
      'comment',
      'order',
      'payment',
      'refund',
      'return',
      'cancellation',
      'shipment',
      'report',
      'support',
      'content',
      'setting',
      'category',
      'region'
    ],
    index: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  reason: {
    type: String,
    trim: true,
    default: ''
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

adminActionLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminActionLog', adminActionLogSchema);
