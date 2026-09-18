const AppError = require('../../utils/AppError');
const analyticsService = require('../analytics/analytics.service');
const safetyService = require('../safety/safety.service');
const Reel = require('../reels/reel.model');
const Comment = require('./comment.model');

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

const getCommentsForReel = async (reelId, user = null) => {
  await ensurePublicReelExists(reelId);
  const safetyContext = await safetyService.getViewerSafetyContext(user);

  return Comment.find(safetyService.applySafetyQuery({ reelId }, safetyContext, {
    targetType: 'comment',
    ownerField: 'userId'
  }))
    .populate('userId', 'name role')
    .sort({ createdAt: -1 })
    .lean();
};

const createComment = async (reelId, user, text) => {
  const reel = await ensurePublicReelExists(reelId);

  const comment = await Comment.create({
    reelId,
    sellerId: reel.sellerId,
    userId: user.id,
    text
  });

  const updatedReel = await Reel.findByIdAndUpdate(
    reelId,
    { $inc: { commentCount: 1 } },
    { new: true }
  );

  const populatedComment = await Comment.findById(comment._id)
    .populate('userId', 'name role')
    .lean();

  await analyticsService.trackEventSafe({
    userId: user.id,
    sellerId: reel.sellerId,
    storeId: reel.storeId,
    reelId: reel._id,
    eventType: 'comment_added',
    metadata: {
      commentId: comment._id
    }
  });

  return {
    comment: populatedComment,
    commentCount: updatedReel.commentCount
  };
};

module.exports = {
  getCommentsForReel,
  createComment
};
