const mongoose = require('mongoose');

const sellerOverrideSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  commissionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  }
}, { _id: false });

const categoryOverrideSchema = new mongoose.Schema({
  category: {
    type: String,
    trim: true,
    required: true
  },
  commissionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  }
}, { _id: false });

const commissionSettingSchema = new mongoose.Schema({
  globalCommissionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  sellerOverrides: [sellerOverrideSchema],
  categoryOverrides: [categoryOverrideSchema],
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CommissionSetting', commissionSettingSchema);
