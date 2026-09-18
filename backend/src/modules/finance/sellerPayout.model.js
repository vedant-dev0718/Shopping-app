const mongoose = require('mongoose');

const sellerPayoutSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  payoutNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    min: 0,
    required: true
  },
  periodStart: {
    type: Date,
    default: null
  },
  periodEnd: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed', 'held'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    trim: true,
    default: ''
  },
  transactionReference: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  paidAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SellerPayout', sellerPayoutSchema);
