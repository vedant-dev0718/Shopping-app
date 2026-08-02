const mongoose = require('mongoose');

const buyerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  savedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  savedStores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  }],
  watchedReels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reel'
  }],
  preferredRegions: [{
    type: String,
    trim: true
  }],
  preferredCategories: [{
    type: String,
    trim: true
  }]
});

module.exports = mongoose.model('BuyerProfile', buyerProfileSchema);
