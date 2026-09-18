const mongoose = require('mongoose');

const moderationActionSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    default: null,
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
  action: {
    type: String,
    enum: [
      'no_action',
      'dismissed',
      'dismiss_report',
      'hide_content',
      'content_hidden',
      'content_removed',
      'restore_content',
      'warn_user',
      'user_warned',
      'suspend_user',
      'user_suspended',
      'user_banned'
    ],
    required: true,
    index: true
  },
  note: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('ModerationAction', moderationActionSchema);
