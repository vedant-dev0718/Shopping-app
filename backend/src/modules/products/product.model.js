const mongoose = require('mongoose');

const ALLOWED_PRODUCT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

const productSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  productLink: {
    type: String,
    trim: true,
    default: ''
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
  region: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0,
    default: null
  },
  discountPercent: {
    type: Number,
    min: 0,
    max: 99,
    default: null
  },
  sku: {
    type: String,
    trim: true,
    default: ''
  },
  barcode: {
    type: String,
    trim: true,
    default: ''
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  sizes: [{
    type: String,
    enum: ALLOWED_PRODUCT_SIZES,
    trim: true
  }],
  reservedStock: {
    type: Number,
    min: 0,
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    min: 0,
    default: 3
  },
  tags: [{
    type: String,
    trim: true
  }],
  imageUrls: [{
    type: String,
    trim: true
  }],
  featured: {
    type: Boolean,
    default: false
  },
  bargainEnabled: {
    type: Boolean,
    default: false,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'hidden', 'sold_out', 'inactive', 'kyc_pending'],
    default: 'active',
    index: true
  },
  inventoryHistory: [{
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    previousStock: {
      type: Number,
      min: 0,
      default: 0
    },
    newStock: {
      type: Number,
      min: 0,
      default: 0
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  saveCount: {
    type: Number,
    default: 0,
    min: 0
  },
  clickCount: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

productSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
