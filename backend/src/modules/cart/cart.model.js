const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  bargainBidId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid',
    default: null,
    index: true
  },
  bargainLockExpiresAt: {
    type: Date,
    default: null
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  priceSnapshot: {
    type: Number,
    required: true,
    min: 0
  }
});

const cartSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  items: [cartItemSchema],
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  shipping: {
    type: Number,
    default: 0,
    min: 0
  },
  finalTotal: {
    type: Number,
    default: 0,
    min: 0
  }
});

module.exports = mongoose.model('Cart', cartSchema);
