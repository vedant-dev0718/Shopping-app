const mongoose = require('mongoose');

const sellerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  storeCategory: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  locality: {
    type: String,
    trim: true,
    default: ''
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  pincode: {
    type: String,
    trim: true,
    default: ''
  },
  country: {
    type: String,
    trim: true,
    default: 'India'
  },
  specialtyRegion: {
    type: String,
    required: true,
    trim: true
  },
  storeDescription: {
    type: String,
    required: true,
    trim: true
  },
  bankAccount: {
    accountNumber: {
      type: String,
      trim: true,
      default: ''
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    accountHolderName: {
      type: String,
      trim: true,
      default: ''
    },
    bankName: {
      type: String,
      trim: true,
      default: ''
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  upiId: {
    type: String,
    trim: true,
    default: ''
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  kycStatus: {
    type: String,
    enum: ['not_submitted', 'pending', 'verified', 'rejected'],
    default: 'not_submitted'
  },
  adminStatus: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active',
    index: true
  },
  razorpayLinkedAccountId: {
    type: String,
    default: ''
  },
  razorpayLinkedAccountStatus: {
    type: String,
    enum: ['not_created', 'created', 'bank_added', 'active'],
    default: 'not_created'
  },
  commissionPercentageOverride: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  pickupAddress: {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    locality: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: 'India' }
  },
  shiprocketPickupName: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('SellerProfile', sellerProfileSchema);
