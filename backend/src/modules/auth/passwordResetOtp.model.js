const mongoose = require('mongoose');

const passwordResetOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  otpHash: {
    type: String,
    required: true,
    select: false
  },
  attempts: {
    type: Number,
    min: 0,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  },
  consumedAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

passwordResetOtpSchema.index({ email: 1, consumedAt: 1, expiresAt: 1 });

module.exports = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);
