const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['buyer', 'seller'],
    required: true
  },
  platform: {
    type: String,
    enum: ['ios', 'android'],
    required: true
  },
  fcmToken: {
    type: String,
    required: true,
    trim: true
  },
  appVersion: {
    type: String,
    trim: true,
    default: ''
  },
  lastSeenAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

deviceTokenSchema.index({ userId: 1, fcmToken: 1 }, { unique: true });

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
