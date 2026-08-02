const AppError = require('../../utils/AppError');
const analyticsService = require('../analytics/analytics.service');
const Reel = require('../reels/reel.model');
const Like = require('./like.model');

const ensurePublicReelExists = async (reelId) => {
  const reel = await Reel.findOne({
    _id: reelId,
    status: 'active'
  });

  if (!reel) {
    throw new AppError('Reel not found', 404);
  }

  return reel;
};

const likeReel = async (reelId, user) => {
  let reel = await ensurePublicReelExists(reelId);
  const existingLike = await Like.findOne({
    userId: user.id,
    reelId
  });

  if (!existingLike) {
    try {
      await Like.create({
        userId: user.id,
        reelId,
        sellerId: reel.sellerId
      });

      reel = await Reel.findByIdAndUpdate(
        reelId,
        { $inc: { likeCount: 1 } },
        { new: true }
      );

      await analyticsService.trackEventSafe({
        userId: user.id,
        sellerId: reel.sellerId,
        storeId: reel.storeId,
        reelId: reel._id,
        eventType: 'reel_like'
      });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      reel = await Reel.findById(reelId);
    }
  }

  return {
    reelId: reel._id,
    liked: true,
    likeCount: reel.likeCount
  };
};

const unlikeReel = async (reelId, user) => {
  const reel = await ensurePublicReelExists(reelId);
  const deletedLike = await Like.findOneAndDelete({
    userId: user.id,
    reelId
  });

  if (deletedLike) {
    reel.likeCount = Math.max(reel.likeCount - 1, 0);
    await reel.save();
  }

  return {
    reelId: reel._id,
    liked: false,
    likeCount: reel.likeCount
  };
};

module.exports = {
  likeReel,
  unlikeReel
};
