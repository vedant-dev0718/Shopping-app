const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const safetyService = require('../safety/safety.service');
const Store = require('../stores/store.model');

const PUBLIC_PRODUCT_STATUSES = ['active', 'sold_out'];
const DEFAULT_LIMIT = 10;

const normalizeLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, 50);
};

const mergeRegionCounts = (target, items, countKey) => {
  items.forEach((item) => {
    const region = item._id;
    const current = target.get(region) || {
      region,
      storeCount: 0,
      productCount: 0,
      reelCount: 0
    };

    current[countKey] = item.count;
    target.set(region, current);
  });
};

const getTrendingStores = async (filters = {}, user = null) => {
  const safetyContext = await safetyService.getViewerSafetyContext(user);

  return Store.find(safetyService.applySafetyQuery({}, safetyContext, {
    targetType: 'store',
    ownerField: 'sellerId'
  }))
    .sort({ viewCount: -1, verified: -1, createdAt: -1 })
    .limit(normalizeLimit(filters.limit))
    .lean();
};

const getTrendingProducts = async (filters = {}, user = null) => {
  const safetyContext = await safetyService.getViewerSafetyContext(user);

  return Product.find(safetyService.applySafetyQuery({ status: { $in: PUBLIC_PRODUCT_STATUSES } }, safetyContext, { targetType: 'product' }))
    .populate('storeId', 'storeName profileImageUrl verified city state region category')
    .sort({ clickCount: -1, saveCount: -1, featured: -1, createdAt: -1 })
    .limit(normalizeLimit(filters.limit))
    .lean();
};

const getTrendingHashtags = async (filters = {}) => {
  return Reel.aggregate([
    { $match: { status: 'active' } },
    { $unwind: '$hashtags' },
    {
      $group: {
        _id: { $toLower: '$hashtags' },
        count: { $sum: 1 },
        totalViews: { $sum: '$viewCount' },
        totalLikes: { $sum: '$likeCount' }
      }
    },
    { $sort: { count: -1, totalViews: -1, totalLikes: -1 } },
    { $limit: normalizeLimit(filters.limit) },
    {
      $project: {
        _id: 0,
        hashtag: '$_id',
        count: 1,
        totalViews: 1,
        totalLikes: 1
      }
    }
  ]);
};

const getTrendingRegions = async (filters = {}) => {
  const [stores, products, reels] = await Promise.all([
    Store.aggregate([
      { $group: { _id: '$region', count: { $sum: 1 } } }
    ]),
    Product.aggregate([
      { $match: { status: { $in: PUBLIC_PRODUCT_STATUSES } } },
      { $group: { _id: '$region', count: { $sum: 1 } } }
    ]),
    Reel.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$region', count: { $sum: 1 } } }
    ])
  ]);
  const regionMap = new Map();

  mergeRegionCounts(regionMap, stores, 'storeCount');
  mergeRegionCounts(regionMap, products, 'productCount');
  mergeRegionCounts(regionMap, reels, 'reelCount');

  return [...regionMap.values()]
    .map((region) => ({
      ...region,
      totalCount: region.storeCount + region.productCount + region.reelCount
    }))
    .sort((left, right) => right.totalCount - left.totalCount)
    .slice(0, normalizeLimit(filters.limit));
};

module.exports = {
  getTrendingStores,
  getTrendingProducts,
  getTrendingHashtags,
  getTrendingRegions
};
