const AppError = require('../../utils/AppError');
const analyticsService = require('../analytics/analytics.service');
const BuyerProfile = require('../buyers/buyerProfile.model');
const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const Like = require('../likes/like.model');
const safetyService = require('../safety/safety.service');
const Store = require('./store.model');
const SellerProfile = require('../sellers/sellerProfile.model');

const PUBLIC_PRODUCT_STATUSES = ['active', 'sold_out'];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const exactTextFilter = (value) => new RegExp(`^${escapeRegExp(value)}$`, 'i');

const buildStoreQuery = (filters = {}) => {
  const query = {};

  if (filters.category) {
    query.category = exactTextFilter(filters.category);
  }

  if (filters.region) {
    query.region = exactTextFilter(filters.region);
  }

  if (filters.city) {
    query.city = exactTextFilter(filters.city);
  }

  if (filters.state) {
    query.state = exactTextFilter(filters.state);
  }

  if (filters.seller) {
    query.sellerId = filters.seller;
  }

  return query;
};

const buildStoreProductQuery = (storeId, filters = {}) => {
  const query = {
    storeId,
    status: filters.status && PUBLIC_PRODUCT_STATUSES.includes(filters.status)
      ? filters.status
      : { $in: PUBLIC_PRODUCT_STATUSES }
  };

  if (filters.category) {
    query.category = exactTextFilter(filters.category);
  }

  if (filters.region) {
    query.region = exactTextFilter(filters.region);
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    query.price = {};

    if (filters.minPrice !== undefined) {
      query.price.$gte = Number(filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query.price.$lte = Number(filters.maxPrice);
    }
  }

  return query;
};

const getViewerSavedState = async (user = null) => {
  if (!user || user.role !== 'buyer') {
    return {
      savedProductIds: new Set(),
      savedStoreIds: new Set()
    };
  }

  const buyerProfile = await BuyerProfile.findOne({ userId: user.id })
    .select('savedProducts savedStores')
    .lean();

  return {
    savedProductIds: new Set((buyerProfile?.savedProducts || []).map((id) => id.toString())),
    savedStoreIds: new Set((buyerProfile?.savedStores || []).map((id) => id.toString()))
  };
};

const getViewerLikedReelIds = async (user = null, reelIds = []) => {
  if (!user || user.role !== 'buyer' || reelIds.length === 0) {
    return new Set();
  }

  const likes = await Like.find({
    userId: user.id,
    reelId: { $in: reelIds }
  }).select('reelId').lean();

  return new Set(likes.map((like) => like.reelId.toString()));
};

const withSavedStores = (stores = [], savedStoreIds = new Set()) => stores.map((store) => ({
  ...store,
  isSaved: savedStoreIds.has(store._id.toString()),
  saveCount: Array.isArray(store.savedBy) ? store.savedBy.length : store.saveCount
}));

const withSavedProducts = (products = [], savedProductIds = new Set()) => products.map((product) => ({
  ...product,
  isSaved: savedProductIds.has(product._id.toString())
}));

const withLikedReels = (reels = [], likedReelIds = new Set(), savedProductIds = new Set()) => reels.map((reel) => ({
  ...reel,
  isLiked: likedReelIds.has(reel._id.toString()),
  taggedProductIds: Array.isArray(reel.taggedProductIds)
    ? withSavedProducts(reel.taggedProductIds, savedProductIds)
    : reel.taggedProductIds
}));

const getStores = async (filters = {}, user = null) => {
  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const { savedStoreIds } = await getViewerSavedState(user);

  const stores = await Store.find(safetyService.applySafetyQuery(buildStoreQuery(filters), safetyContext, {
    targetType: 'store',
    ownerField: 'sellerId'
  }))
    .sort({ verified: -1, createdAt: -1 })
    .lean();

  return withSavedStores(stores, savedStoreIds);
};

const getStoreById = async (storeId, user = null) => {
  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const { savedStoreIds } = await getViewerSavedState(user);
  const store = await Store.findOne(safetyService.applySafetyQuery({ _id: storeId }, safetyContext, {
    targetType: 'store',
    ownerField: 'sellerId'
  })).lean();

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  return withSavedStores([store], savedStoreIds)[0];
};

const getSellerStore = async (sellerId) => {
  const store = await Store.findOne({ sellerId }).lean();

  if (!store) {
    throw new AppError('Seller store not found', 404);
  }

  return store;
};

const updateSellerStore = async (sellerId, data) => {
  const store = await Store.findOne({ sellerId });

  if (!store) {
    throw new AppError('Seller store not found', 404);
  }

  const fields = [
    'storeName',
    'category',
    'locality',
    'city',
    'state',
    'pincode',
    'country',
    'region',
    'description',
    'story',
    'profileImageUrl',
    'bannerImageUrl',
    'featuredCategories'
  ];

  fields.forEach((field) => {
    if (data[field] !== undefined) {
      store[field] = data[field];
    }
  });

  await store.save();
  await SellerProfile.findOneAndUpdate(
    { userId: sellerId },
    {
      storeName: store.storeName,
      storeCategory: store.category,
      locality: store.locality || '',
      city: store.city,
      state: store.state,
      pincode: store.pincode || '',
      country: store.country || 'India',
      specialtyRegion: store.region,
      storeDescription: store.description
    }
  );
  return store.toObject();
};

const getStoreProducts = async (storeId, filters = {}, user = null) => {
  await getStoreById(storeId, user);
  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const { savedProductIds } = await getViewerSavedState(user);

  const products = await Product.find(safetyService.applySafetyQuery(buildStoreProductQuery(storeId, filters), safetyContext, { targetType: 'product' }))
    .sort({ featured: -1, createdAt: -1 })
    .lean();

  return withSavedProducts(products, savedProductIds);
};

const isProductAvailable = (product) => {
  return Boolean(product && product.status === 'active' && product.stock > 0);
};

const hasAvailableTaggedProduct = (reel) => {
  return Array.isArray(reel.taggedProductIds) && reel.taggedProductIds.some(isProductAvailable);
};

const getStoreReels = async (storeId, user = null) => {
  await getStoreById(storeId, user);
  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const { savedProductIds } = await getViewerSavedState(user);

  const reels = await Reel.find(safetyService.applySafetyQuery({
    storeId,
    status: 'active'
  }, safetyContext, { targetType: 'reel' }))
    .populate('storeId', 'storeName profileImageUrl verified city state region')
    .populate('taggedProductIds', 'sellerId storeId title description productLink category region price stock tags imageUrls featured status saveCount clickCount createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const availableReels = reels.filter(hasAvailableTaggedProduct);
  const likedReelIds = await getViewerLikedReelIds(user, availableReels.map((reel) => reel._id));

  return withLikedReels(availableReels, likedReelIds, savedProductIds);
};

const recordStoreView = async (storeId, user = null) => {
  const store = await Store.findByIdAndUpdate(
    storeId,
    { $inc: { viewCount: 1 } },
    { new: true }
  );

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  await analyticsService.trackEventSafe({
    userId: user ? user.id : null,
    sellerId: store.sellerId,
    storeId: store._id,
    eventType: 'store_view'
  });

  return {
    storeId: store._id,
    viewCount: store.viewCount
  };
};

const getBuyerProfile = async (userId) => {
  const buyerProfile = await BuyerProfile.findOne({ userId });

  if (!buyerProfile) {
    throw new AppError('Buyer profile not found', 404);
  }

  return buyerProfile;
};

const saveStore = async (storeId, user) => {
  const store = await Store.findById(storeId);

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  const buyerProfile = await getBuyerProfile(user.id);
  const storeAlreadySavedByBuyer = buyerProfile.savedStores.some((savedStoreId) => {
    return savedStoreId.toString() === store._id.toString();
  });
  const storeAlreadyHasBuyer = store.savedBy.some((savedById) => {
    return savedById.toString() === user.id.toString();
  });

  if (!storeAlreadySavedByBuyer) {
    buyerProfile.savedStores.push(store._id);
    await analyticsService.trackEventSafe({
      userId: user.id,
      sellerId: store.sellerId,
      storeId: store._id,
      eventType: 'store_save'
    });
  }

  if (!storeAlreadyHasBuyer) {
    store.savedBy.push(user.id);
  }

  await Promise.all([buyerProfile.save(), store.save()]);

  return {
    storeId: store._id,
    saved: true,
    saveCount: store.savedBy.length
  };
};

const unsaveStore = async (storeId, user) => {
  const store = await Store.findById(storeId);

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  const buyerProfile = await getBuyerProfile(user.id);

  buyerProfile.savedStores = buyerProfile.savedStores.filter((savedStoreId) => {
    return savedStoreId.toString() !== store._id.toString();
  });
  store.savedBy = store.savedBy.filter((savedById) => {
    return savedById.toString() !== user.id.toString();
  });

  await Promise.all([buyerProfile.save(), store.save()]);

  return {
    storeId: store._id,
    saved: false,
    saveCount: store.savedBy.length
  };
};

module.exports = {
  getStores,
  getStoreById,
  getSellerStore,
  updateSellerStore,
  getStoreProducts,
  getStoreReels,
  recordStoreView,
  saveStore,
  unsaveStore
};
