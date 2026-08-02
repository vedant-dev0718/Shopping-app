const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  videoUrl: {
    type: String,
    required: true,
    trim: true
  },
  thumbnailUrl: {
    type: String,
    required: true,
    trim: true
  },
  videoPublicId: {
    type: String,
    trim: true,
    default: ''
  },
  duration: {
    type: Number,
    default: 0,
    min: 0
  },
  fileSize: {
    type: Number,
    default: 0,
    min: 0
  },
  mimeType: {
    type: String,
    trim: true,
    default: ''
  },
  processingStatus: {
    type: String,
    enum: ['ready', 'processing', 'failed'],
    default: 'ready'
  },
  caption: {
    type: String,
    trim: true,
    default: ''
  },
  hashtags: [{
    type: String,
    trim: true
  }],
  region: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  subcategory: {
    type: String,
    trim: true,
    default: ''
  },
  taggedProductIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  }],
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  likeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  commentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  mutedByDefault: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'hidden', 'sold_out', 'removed'],
    default: 'active',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

reelSchema.index({ caption: 'text', hashtags: 'text' });

module.exports = mongoose.model('Reel', reelSchema);
