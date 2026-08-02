const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reel',
    required: true,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

likeSchema.index({ userId: 1, reelId: 1 }, { unique: true });
likeSchema.index({ sellerId: 1, reelId: 1 });

module.exports = mongoose.model('Like', likeSchema);
