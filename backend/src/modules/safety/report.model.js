const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetType: {
    type: String,
    enum: ['reel', 'product', 'comment', 'store', 'user'],
    required: true,
    index: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  targetOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  reason: {
    type: String,
    enum: ['spam', 'harassment', 'hate', 'nudity', 'violence', 'scam', 'counterfeit', 'self_harm', 'other'],
    required: true
  },
  details: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolutionNote: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  moderationActionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ModerationAction',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
