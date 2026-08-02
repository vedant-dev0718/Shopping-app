const mongoose = require('mongoose');

const pendingSignupSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  role: {
    type: String,
    enum: ['buyer', 'seller'],
    required: true,
    index: true
  },
  signupPayload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  otpHash: {
    type: String,
    required: true,
    select: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  sendCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  },
  resendAvailableAt: {
    type: Date,
    required: true
  },
  lastSentAt: {
    type: Date,
    default: Date.now
  },
  consumedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

pendingSignupSchema.index({ email: 1, role: 1, consumedAt: 1 });

module.exports = mongoose.model('PendingSignup', pendingSignupSchema);
