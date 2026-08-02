const AppError = require('../../utils/AppError');
const analyticsService = require('../analytics/analytics.service');
const BuyerProfile = require('../buyers/buyerProfile.model');
const Product = require('../products/product.model');
const Store = require('../stores/store.model');
const Comment = require('../comments/comment.model');
const Like = require('../likes/like.model');
const safetyService = require('../safety/safety.service');
const Reel = require('./reel.model');

const reelPopulate = [
  {
    path: 'storeId',
    select: 'storeName profileImageUrl verified city state region'
  },
  {
    path: 'taggedProductIds',
    select: 'sellerId storeId title description productLink category subcategory region price stock tags imageUrls featured status saveCount clickCount createdAt'
  }
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const exactTextFilter = (value) => new RegExp(`^${escapeRegExp(value)}$`, 'i');

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean);
};

const isProductAvailable = (product) => {
  return Boolean(product && product.status === 'active' && product.stock > 0);
};

const hasAvailableTaggedProduct = (reel) => {
  return Array.isArray(reel.taggedProductIds) && reel.taggedProductIds.some(isProductAvailable);
};

const getViewerReelState = async (user = null, reels = []) => {
  if (!user || user.role !== 'buyer') {
    return {
      likedReelIds: new Set(),
      savedProductIds: new Set()
    };
  }

  const reelIds = reels.map((reel) => reel._id);
  const [likes, buyerProfile] = await Promise.all([
    reelIds.length > 0
      ? Like.find({ userId: user.id, reelId: { $in: reelIds } }).select('reelId').lean()
      : [],
    BuyerProfile.findOne({ userId: user.id }).select('savedProducts').lean()
  ]);

  return {
    likedReelIds: new Set(likes.map((like) => like.reelId.toString())),
    savedProductIds: new Set((buyerProfile?.savedProducts || []).map((id) => id.toString()))
  };
};

const withViewerReelState = (reels = [], likedReelIds = new Set(), savedProductIds = new Set()) => reels.map((reel) => ({
  ...reel,
  isLiked: likedReelIds.has(reel._id.toString()),
  taggedProductIds: Array.isArray(reel.taggedProductIds)
    ? reel.taggedProductIds.map((product) => ({
      ...product,
      isSaved: savedProductIds.has(product._id.toString())
    }))
    : reel.taggedProductIds
}));

const resolveReelStatus = (requestedStatus, taggedProducts, currentStatus = 'active') => {
  if (requestedStatus === 'hidden') {
    return 'hidden';
  }

  if (!taggedProducts.some(isProductAvailable)) {
    return 'sold_out';
  }

  if (requestedStatus === 'sold_out') {
    return 'sold_out';
  }

  if (!requestedStatus && currentStatus === 'hidden') {
    return 'hidden';
  }

  if (!requestedStatus && currentStatus === 'sold_out') {
    return 'active';
  }

  return requestedStatus || currentStatus || 'active';
};

const buildReelQuery = async (filters = {}) => {
  const query = {
    status: 'active'
  };

  if (filters.category) {
    query.category = exactTextFilter(filters.category);
  }

  if (filters.region) {
    query.region = exactTextFilter(filters.region);
  }

  if (filters.seller) {
    query.sellerId = filters.seller;
  }

  if (filters.store) {
    query.storeId = filters.store;
  }

  if (filters.city || filters.state) {
    const storeQuery = {};

    if (filters.city) {
      storeQuery.city = exactTextFilter(filters.city);
    }

    if (filters.state) {
      storeQuery.state = exactTextFilter(filters.state);
    }

    const storeIds = await Store.find(storeQuery).distinct('_id');

    if (storeIds.length === 0) {
      return { query, empty: true };
    }

    if (query.storeId) {
      return {
        query,
        empty: !storeIds.some((storeId) => storeId.toString() === query.storeId.toString())
      };
    }

    query.storeId = { $in: storeIds };
  }

  return { query };
};

const getPublicReels = async (filters = {}, user = null) => {
  const { query, empty } = await buildReelQuery(filters);

  if (empty) {
    return [];
  }

  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const reels = await Reel.find(safetyService.applySafetyQuery(query, safetyContext, { targetType: 'reel' }))
    .populate(reelPopulate)
    .sort({ createdAt: -1 })
    .lean();

  const availableReels = reels.filter(hasAvailableTaggedProduct);
  const { likedReelIds, savedProductIds } = await getViewerReelState(user, availableReels);

  return withViewerReelState(availableReels, likedReelIds, savedProductIds);
};

const getPublicReelById = async (reelId, user = null) => {
  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const reel = await Reel.findOne({
    ...safetyService.applySafetyQuery({ _id: reelId }, safetyContext, { targetType: 'reel' }),
    status: 'active'
  })
    .populate(reelPopulate)
    .lean();

  if (!reel || !hasAvailableTaggedProduct(reel)) {
    throw new AppError('Reel not found', 404);
  }

  const { likedReelIds, savedProductIds } = await getViewerReelState(user, [reel]);

  return withViewerReelState([reel], likedReelIds, savedProductIds)[0];
};

const recordReelView = async (reelId, user = null) => {
  const reel = await Reel.findOneAndUpdate(
    {
      _id: reelId,
      status: 'active'
    },
    { $inc: { viewCount: 1 } },
    { new: true }
  );

  if (!reel) {
    throw new AppError('Reel not found', 404);
  }

  if (user && user.role === 'buyer') {
    await BuyerProfile.updateOne(
      { userId: user.id },
      { $addToSet: { watchedReels: reel._id } }
    );
  }

  await analyticsService.trackEventSafe({
    userId: user ? user.id : null,
    sellerId: reel.sellerId,
    storeId: reel.storeId,
    reelId: reel._id,
    eventType: 'reel_view'
  });

  return {
    reelId: reel._id,
    viewCount: reel.viewCount
  };
};

const getTaggedProducts = async (reelId, user = null) => {
  const reel = await getPublicReelById(reelId, user);
  const safetyContext = await safetyService.getViewerSafetyContext(user);

  return safetyService.filterSafeItems(reel.taggedProductIds, safetyContext, { targetType: 'product' });
};

const getStoreReels = async (storeId, user = null) => {
  const store = await Store.findById(storeId);

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const reels = await Reel.find(safetyService.applySafetyQuery({
    storeId,
    status: 'active'
  }, safetyContext, { targetType: 'reel' }))
    .populate(reelPopulate)
    .sort({ createdAt: -1 })
    .lean();

  const availableReels = reels.filter(hasAvailableTaggedProduct);
  const { likedReelIds, savedProductIds } = await getViewerReelState(user, availableReels);

  return withViewerReelState(availableReels, likedReelIds, savedProductIds);
};

const findSellerStore = async (sellerId, requestedStoreId = null) => {
  const query = {
    sellerId
  };

  if (requestedStoreId) {
    query._id = requestedStoreId;
  }

  const store = await Store.findOne(query);

  if (!store) {
    throw new AppError('Seller store not found', 404);
  }

  return store;
};

const getTaggedProductsForSeller = async (taggedProductIds, sellerId, storeId) => {
  const uniqueProductIds = [...new Set(taggedProductIds.map((productId) => productId.toString()))];

  if (uniqueProductIds.length !== taggedProductIds.length) {
    throw new AppError('Tagged products must be unique', 400);
  }

  const products = await Product.find({
    _id: { $in: uniqueProductIds },
    sellerId,
    storeId
  });

  if (products.length !== uniqueProductIds.length) {
    throw new AppError('Tagged products must belong to this seller and store', 400);
  }

  return products;
};

const createSellerReel = async (user, data) => {
  const store = await findSellerStore(user.id, data.storeId);
  const taggedProducts = await getTaggedProductsForSeller(data.taggedProductIds, user.id, store._id);

  return Reel.create({
    sellerId: user.id,
    storeId: store._id,
    videoUrl: data.videoUrl,
    thumbnailUrl: data.thumbnailUrl,
    caption: data.caption || '',
    hashtags: normalizeStringArray(data.hashtags),
    region: data.region,
    category: data.category,
    subcategory: data.subcategory || '',
    taggedProductIds: taggedProducts.map((product) => product._id),
    mutedByDefault: data.mutedByDefault ?? true,
    status: resolveReelStatus(data.status, taggedProducts),
    videoPublicId: data.videoPublicId || '',
    duration: data.duration || 0,
    fileSize: data.fileSize || 0,
    mimeType: data.mimeType || '',
    processingStatus: data.processingStatus || 'ready'
  });
};

const getSellerReels = async (sellerId) => {
  return Reel.find({ sellerId })
    .populate(reelPopulate)
    .sort({ createdAt: -1 })
    .lean();
};

const updateSellerReel = async (user, reelId, data) => {
  const reel = await Reel.findOne({
    _id: reelId,
    sellerId: user.id
  });

  if (!reel) {
    throw new AppError('Reel not found for this seller', 404);
  }

  let storeId = reel.storeId;

  if (data.storeId) {
    const store = await findSellerStore(user.id, data.storeId);
    storeId = store._id;
    reel.storeId = store._id;
  }

  let taggedProducts;

  if (data.taggedProductIds) {
    taggedProducts = await getTaggedProductsForSeller(data.taggedProductIds, user.id, storeId);
    reel.taggedProductIds = taggedProducts.map((product) => product._id);
  } else if (data.storeId) {
    taggedProducts = await getTaggedProductsForSeller(reel.taggedProductIds, user.id, storeId);
  } else {
    taggedProducts = await Product.find({
      _id: { $in: reel.taggedProductIds },
      sellerId: user.id,
      storeId
    });
  }

  const updatableFields = [
    'videoUrl',
    'thumbnailUrl',
    'caption',
    'region',
    'category',
    'subcategory',
    'mutedByDefault',
    'videoPublicId',
    'duration',
    'fileSize',
    'mimeType',
    'processingStatus'
  ];

  updatableFields.forEach((field) => {
    if (data[field] !== undefined) {
      reel[field] = data[field];
    }
  });

  if (data.hashtags !== undefined) {
    reel.hashtags = normalizeStringArray(data.hashtags);
  }

  reel.status = resolveReelStatus(data.status, taggedProducts, reel.status);

  return reel.save();
};

const deleteSellerReel = async (user, reelId) => {
  const reel = await Reel.findOneAndDelete({
    _id: reelId,
    sellerId: user.id
  });

  if (!reel) {
    throw new AppError('Reel not found for this seller', 404);
  }

  await Promise.all([
    Comment.deleteMany({ reelId: reel._id }),
    Like.deleteMany({ reelId: reel._id })
  ]);

  return {
    reelId: reel._id,
    deleted: true
  };
};

module.exports = {
  getPublicReels,
  getPublicReelById,
  recordReelView,
  getTaggedProducts,
  getStoreReels,
  getSellerReels,
  createSellerReel,
  updateSellerReel,
  deleteSellerReel
};
