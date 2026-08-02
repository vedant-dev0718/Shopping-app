const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const BuyerProfile = require('../buyers/buyerProfile.model');
const Like = require('../likes/like.model');
const safetyService = require('../safety/safety.service');
const Store = require('../stores/store.model');

const FEED_CATEGORIES = [
  'For You',
  'Sarees',
  'Suits',
  'Streetwear',
  'Jewelry',
  'Footwear',
  'Accessories',
  'Bridal',
  'Regional Wear'
];
const PUBLIC_PRODUCT_STATUSES = ['active', 'sold_out'];
const DEFAULT_LIMIT = 20;

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const exactTextFilter = (value) => new RegExp(`^${escapeRegExp(value)}$`, 'i');

const normalizeLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, 50);
};

const isForYouCategory = (category) => {
  return !category || String(category).toLowerCase() === 'for you';
};

const isProductAvailable = (product) => {
  return Boolean(product && product.status === 'active' && product.stock > 0);
};

const hasAvailableTaggedProduct = (reel) => {
  return Array.isArray(reel.taggedProductIds) && reel.taggedProductIds.some(isProductAvailable);
};

const getViewerState = async (user = null, reelIds = []) => {
  if (!user || user.role !== 'buyer') {
    return {
      savedProductIds: new Set(),
      savedStoreIds: new Set(),
      likedReelIds: new Set()
    };
  }

  const [buyerProfile, likes] = await Promise.all([
    BuyerProfile.findOne({ userId: user.id }).select('savedProducts savedStores').lean(),
    reelIds.length > 0
      ? Like.find({ userId: user.id, reelId: { $in: reelIds } }).select('reelId').lean()
      : []
  ]);

  return {
    savedProductIds: new Set((buyerProfile?.savedProducts || []).map((id) => id.toString())),
    savedStoreIds: new Set((buyerProfile?.savedStores || []).map((id) => id.toString())),
    likedReelIds: new Set(likes.map((like) => like.reelId.toString()))
  };
};

const withSavedProducts = (products = [], savedProductIds = new Set()) => products.map((product) => ({
  ...product,
  isSaved: savedProductIds.has(product._id.toString())
}));

const withViewerReels = (reels = [], viewerState) => reels.map((reel) => ({
  ...reel,
  isLiked: viewerState.likedReelIds.has(reel._id.toString()),
  taggedProductIds: Array.isArray(reel.taggedProductIds)
    ? withSavedProducts(reel.taggedProductIds, viewerState.savedProductIds)
    : reel.taggedProductIds
}));

const withSavedStores = (stores = [], savedStoreIds = new Set()) => stores.map((store) => ({
  ...store,
  isSaved: savedStoreIds.has(store._id.toString()),
  saveCount: Array.isArray(store.savedBy) ? store.savedBy.length : store.saveCount
}));

const publicReelPopulate = [
  {
    path: 'storeId',
    select: 'storeName profileImageUrl verified city state region'
  },
  {
    path: 'taggedProductIds',
    select: 'title description productLink category region price stock tags imageUrls featured status saveCount clickCount createdAt'
  }
];

const publicProductPopulate = {
  path: 'storeId',
  select: 'storeName profileImageUrl verified city state region category'
};

const buildStoreDiscoveryQuery = (filters = {}) => {
  const query = {};

  ['region', 'city', 'state', 'category'].forEach((field) => {
    if (filters[field]) {
      query[field] = exactTextFilter(filters[field]);
    }
  });

  return query;
};

const getDiscoveryFeed = async (filters = {}, user = null) => {
  const limit = normalizeLimit(filters.limit);
  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const productQuery = {
    status: { $in: PUBLIC_PRODUCT_STATUSES }
  };
  const reelQuery = {
    status: 'active'
  };

  if (!isForYouCategory(filters.category)) {
    productQuery.category = exactTextFilter(filters.category);
    reelQuery.category = exactTextFilter(filters.category);
  }

  const [products, reels] = await Promise.all([
    Product.find(safetyService.applySafetyQuery(productQuery, safetyContext, { targetType: 'product' }))
      .populate(publicProductPopulate)
      .sort({ featured: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
    Reel.find(safetyService.applySafetyQuery(reelQuery, safetyContext, { targetType: 'reel' }))
      .populate(publicReelPopulate)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
  ]);
  const availableReels = reels.filter(hasAvailableTaggedProduct);
  const viewerState = await getViewerState(user, availableReels.map((reel) => reel._id));
  const productsWithState = withSavedProducts(products, viewerState.savedProductIds);
  const reelsWithState = withViewerReels(availableReels, viewerState);

  const feedItems = [
    ...productsWithState.map((product) => ({
      type: 'product',
      createdAt: product.createdAt,
      data: product
    })),
    ...reelsWithState.map((reel) => ({
      type: 'reel',
      createdAt: reel.createdAt,
      data: reel
    }))
  ];

  return feedItems
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, limit);
};

const getCategories = async () => {
  const activeReels = await Reel.find({ status: 'active' })
    .populate('taggedProductIds', 'stock status')
    .lean();
  const availableReelCounts = activeReels
    .filter(hasAvailableTaggedProduct)
    .reduce((counts, reel) => {
      counts[reel.category] = (counts[reel.category] || 0) + 1;
      return counts;
    }, {});

  const productCounts = await Product.aggregate([
    { $match: { status: { $in: PUBLIC_PRODUCT_STATUSES } } },
    { $group: { _id: '$category', productCount: { $sum: 1 } } }
  ]);
  const productCountMap = new Map(productCounts.map((item) => [item._id, item.productCount]));

  return FEED_CATEGORIES.map((category) => {
    if (category === 'For You') {
      return {
        name: category,
        productCount: productCounts.reduce((total, item) => total + item.productCount, 0),
        reelCount: activeReels.filter(hasAvailableTaggedProduct).length
      };
    }

    return {
      name: category,
      productCount: productCountMap.get(category) || 0,
      reelCount: availableReelCounts[category] || 0
    };
  });
};

const getRegions = async () => {
  const [stores, products, activeReels] = await Promise.all([
    Store.aggregate([
      { $group: { _id: '$region', storeCount: { $sum: 1 } } }
    ]),
    Product.aggregate([
      { $match: { status: { $in: PUBLIC_PRODUCT_STATUSES } } },
      { $group: { _id: '$region', productCount: { $sum: 1 } } }
    ]),
    Reel.find({ status: 'active' }).populate('taggedProductIds', 'stock status').lean()
  ]);

  const regionMap = new Map();

  stores.forEach((item) => {
    regionMap.set(item._id, {
      name: item._id,
      storeCount: item.storeCount,
      productCount: 0,
      reelCount: 0
    });
  });

  products.forEach((item) => {
    const current = regionMap.get(item._id) || {
      name: item._id,
      storeCount: 0,
      productCount: 0,
      reelCount: 0
    };
    current.productCount = item.productCount;
    regionMap.set(item._id, current);
  });

  activeReels.filter(hasAvailableTaggedProduct).forEach((reel) => {
    const current = regionMap.get(reel.region) || {
      name: reel.region,
      storeCount: 0,
      productCount: 0,
      reelCount: 0
    };
    current.reelCount += 1;
    regionMap.set(reel.region, current);
  });

  return [...regionMap.values()]
    .map((region) => ({
      ...region,
      totalCount: region.storeCount + region.productCount + region.reelCount
    }))
    .sort((left, right) => right.totalCount - left.totalCount);
};

const getFeaturedStores = async (filters = {}, user = null) => {
  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const viewerState = await getViewerState(user);

  const stores = await Store.find(safetyService.applySafetyQuery(buildStoreDiscoveryQuery(filters), safetyContext, {
    targetType: 'store',
    ownerField: 'sellerId'
  }))
    .sort({ verified: -1, viewCount: -1, createdAt: -1 })
    .limit(normalizeLimit(filters.limit, 12))
    .lean();

  return withSavedStores(stores, viewerState.savedStoreIds);
};

module.exports = {
  FEED_CATEGORIES,
  getDiscoveryFeed,
  getCategories,
  getRegions,
  getFeaturedStores
};
