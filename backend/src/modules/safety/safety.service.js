const AppError = require('../../utils/AppError');
const User = require('../users/user.model');
const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const Store = require('../stores/store.model');
const Comment = require('../comments/comment.model');
const Report = require('./report.model');
const BlockedUser = require('./blockedUser.model');
const ModerationAction = require('./moderationAction.model');

const REPORT_HIDDEN_STATUSES = ['pending', 'reviewing', 'resolved'];

const findTarget = async (targetType, targetId) => {
  if (targetType === 'product') {
    const product = await Product.findById(targetId).select('sellerId status title').lean();
    return product ? { target: product, ownerId: product.sellerId } : null;
  }

  if (targetType === 'reel') {
    const reel = await Reel.findById(targetId).select('sellerId status caption').lean();
    return reel ? { target: reel, ownerId: reel.sellerId } : null;
  }

  if (targetType === 'store') {
    const store = await Store.findById(targetId).select('sellerId storeName').lean();
    return store ? { target: store, ownerId: store.sellerId } : null;
  }

  if (targetType === 'comment') {
    const comment = await Comment.findById(targetId).select('userId sellerId text').lean();
    return comment ? { target: comment, ownerId: comment.userId } : null;
  }

  if (targetType === 'user') {
    const user = await User.findById(targetId).select('role accountStatus').lean();
    return user ? { target: user, ownerId: user._id } : null;
  }

  return null;
};

const assertTargetExists = async (targetType, targetId) => {
  const result = await findTarget(targetType, targetId);

  if (!result) {
    throw new AppError('Report target not found', 404);
  }

  return result;
};

const createReport = async (user, data) => {
  const { ownerId } = await assertTargetExists(data.targetType, data.targetId);

  if (data.targetType === 'user' && data.targetId.toString() === user.id.toString()) {
    throw new AppError('You cannot report your own account', 400);
  }

  const report = await Report.findOneAndUpdate(
    {
      reporterId: user.id,
      targetType: data.targetType,
      targetId: data.targetId
    },
    {
      $set: {
        targetOwnerId: ownerId,
        reason: data.reason,
        details: data.details || '',
        status: 'pending',
        resolvedBy: null,
        resolvedAt: null,
        resolutionNote: '',
        moderationActionId: null
      },
      $setOnInsert: {
        reporterId: user.id,
        targetType: data.targetType,
        targetId: data.targetId
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  return {
    report,
    hiddenFromReporter: true
  };
};

const blockUser = async (user, blockedUserId) => {
  if (blockedUserId.toString() === user.id.toString()) {
    throw new AppError('You cannot block your own account', 400);
  }

  const blockedUser = await User.findById(blockedUserId).select('_id role accountStatus').lean();

  if (!blockedUser || blockedUser.accountStatus === 'deleted') {
    throw new AppError('User not found', 404);
  }

  const block = await BlockedUser.findOneAndUpdate(
    {
      blockerId: user.id,
      blockedUserId
    },
    {
      $setOnInsert: {
        blockerId: user.id,
        blockedUserId
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  return {
    blocked: true,
    block
  };
};

const unblockUser = async (user, blockedUserId) => {
  await BlockedUser.deleteOne({
    blockerId: user.id,
    blockedUserId
  });

  return {
    blocked: false,
    blockedUserId
  };
};

const getBlockedUsers = async (user) => {
  return BlockedUser.find({ blockerId: user.id })
    .populate('blockedUserId', 'name role')
    .sort({ createdAt: -1 })
    .lean();
};

const getViewerSafetyContext = async (user = null) => {
  if (!user || !user.id) {
    return {
      hiddenIdsByType: {},
      hiddenOwnerIds: []
    };
  }

  const [reports, blocks] = await Promise.all([
    Report.find({
      reporterId: user.id,
      status: { $in: REPORT_HIDDEN_STATUSES }
    }).select('targetType targetId targetOwnerId').lean(),
    BlockedUser.find({ blockerId: user.id }).select('blockedUserId').lean()
  ]);

  const hiddenIdsByType = {};
  const hiddenOwnerIds = blocks.map((block) => block.blockedUserId);

  reports.forEach((report) => {
    hiddenIdsByType[report.targetType] = hiddenIdsByType[report.targetType] || [];
    hiddenIdsByType[report.targetType].push(report.targetId);

    if (report.targetType === 'user') {
      hiddenOwnerIds.push(report.targetId);
    }
  });

  return {
    hiddenIdsByType,
    hiddenOwnerIds
  };
};

const applySafetyQuery = (query, context, {
  targetType,
  ownerField = 'sellerId'
}) => {
  const nextQuery = { ...query };
  const hiddenIds = (context.hiddenIdsByType && context.hiddenIdsByType[targetType]) || [];
  const mergeNin = (currentValue, hiddenValues) => {
    if (!currentValue) {
      return { $nin: hiddenValues };
    }

    const isOperatorObject = typeof currentValue === 'object'
      && !Array.isArray(currentValue)
      && Object.keys(currentValue).some((key) => key.startsWith('$'));

    if (isOperatorObject) {
      return {
        ...currentValue,
        $nin: hiddenValues
      };
    }

    return {
      $eq: currentValue,
      $nin: hiddenValues
    };
  };

  if (hiddenIds.length > 0) {
    nextQuery._id = mergeNin(nextQuery._id, hiddenIds);
  }

  if (context.hiddenOwnerIds && context.hiddenOwnerIds.length > 0 && ownerField) {
    nextQuery[ownerField] = mergeNin(nextQuery[ownerField], context.hiddenOwnerIds);
  }

  return nextQuery;
};

const filterSafeItems = (items, context, {
  targetType,
  ownerField = 'sellerId'
}) => {
  const hiddenIds = new Set(((context.hiddenIdsByType && context.hiddenIdsByType[targetType]) || []).map((id) => id.toString()));
  const hiddenOwners = new Set((context.hiddenOwnerIds || []).map((id) => id.toString()));

  return items.filter((item) => {
    const itemId = item && item._id ? item._id.toString() : '';
    const owner = ownerField && item && item[ownerField] ? item[ownerField].toString() : '';

    return !hiddenIds.has(itemId) && (!ownerField || !hiddenOwners.has(owner));
  });
};

const listReports = async (filters = {}) => {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.targetType) {
    query.targetType = filters.targetType;
  }

  const limit = filters.limit || 50;

  return Report.find(query)
    .populate('reporterId', 'name email role')
    .populate('targetOwnerId', 'name email role')
    .populate('resolvedBy', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

const applyModerationAction = async (report, action) => {
  if (action === 'hide_content') {
    if (report.targetType === 'product') {
      await Product.updateOne({ _id: report.targetId }, { $set: { status: 'inactive', featured: false } });
    } else if (report.targetType === 'reel') {
      await Reel.updateOne({ _id: report.targetId }, { $set: { status: 'hidden' } });
    } else if (report.targetType === 'comment') {
      await Comment.updateOne({ _id: report.targetId }, { $set: { text: '[removed by moderation]' } });
    } else if (report.targetType === 'store') {
      await Store.updateOne({ _id: report.targetId }, { $set: { verified: false } });
    }
  }

  if (action === 'restore_content') {
    if (report.targetType === 'product') {
      await Product.updateOne({ _id: report.targetId }, { $set: { status: 'active' } });
    } else if (report.targetType === 'reel') {
      await Reel.updateOne({ _id: report.targetId }, { $set: { status: 'active' } });
    }
  }

  if (action === 'suspend_user') {
    const userId = report.targetType === 'user' ? report.targetId : report.targetOwnerId;

    if (userId) {
      await User.updateOne(
        { _id: userId, accountStatus: { $ne: 'deleted' } },
        { $set: { accountStatus: 'suspended', authInvalidatedAt: new Date() } }
      );
    }
  }
};

const resolveReport = async (adminUser, reportId, data) => {
  const report = await Report.findById(reportId);

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  const action = await ModerationAction.create({
    adminId: adminUser.id,
    reportId: report._id,
    targetType: report.targetType,
    targetId: report.targetId,
    action: data.action,
    note: data.note || ''
  });

  await applyModerationAction(report, data.action);

  report.status = data.status || (data.action === 'dismiss_report' ? 'dismissed' : 'resolved');
  report.resolvedBy = adminUser.id;
  report.resolvedAt = new Date();
  report.resolutionNote = data.note || '';
  report.moderationActionId = action._id;
  await report.save();

  return {
    report,
    action
  };
};

module.exports = {
  createReport,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getViewerSafetyContext,
  applySafetyQuery,
  filterSafeItems,
  listReports,
  resolveReport
};
