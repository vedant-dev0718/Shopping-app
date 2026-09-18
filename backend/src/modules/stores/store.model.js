const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
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
  region: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  story: {
    type: String,
    trim: true,
    default: ''
  },
  profileImageUrl: {
    type: String,
    trim: true,
    default: ''
  },
  bannerImageUrl: {
    type: String,
    trim: true,
    default: ''
  },
  verified: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'hidden', 'suspended'],
    default: 'active',
    index: true
  },
  featuredCategories: [{
    type: String,
    trim: true
  }],
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  completedOrderCount: {
    type: Number,
    default: 0,
    min: 0
  },
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Store', storeSchema);
