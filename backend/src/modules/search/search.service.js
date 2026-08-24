const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const BuyerProfile = require('../buyers/buyerProfile.model');
const Like = require('../likes/like.model');
const safetyService = require('../safety/safety.service');
const Store = require('../stores/store.model');
const User = require('../users/user.model');

const PUBLIC_PRODUCT_STATUSES = ['active', 'sold_out'];
const DEFAULT_LIMIT = 20;

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const makeSearchRegex = (value) => new RegExp(escapeRegExp(String(value).trim()), 'i');

const exactTextFilter = (value) => new RegExp(`^${escapeRegExp(value)}$`, 'i');

const normalizeLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, 50);
};

const normalizeIdFilter = (filters, primaryKey, secondaryKey) => {
  return filters[primaryKey] || filters[secondaryKey];
};

const normalizeNumberFilter = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const hasPriceFilter = (filters = {}) => {
  return normalizeNumberFilter(filters.minPrice) !== null || normalizeNumberFilter(filters.maxPrice) !== null;
};

const buildPriceQuery = (filters = {}) => {
  const minPrice = normalizeNumberFilter(filters.minPrice);
  const maxPrice = normalizeNumberFilter(filters.maxPrice);

  if (minPrice === null && maxPrice === null) {
    return null;
  }

  const price = {};

  if (minPrice !== null) {
    price.$gte = minPrice;
  }

  if (maxPrice !== null) {
    price.$lte = maxPrice;
  }

  return price;
};

const productMatchesPriceFilter = (product, filters = {}) => {
  const minPrice = normalizeNumberFilter(filters.minPrice);
  const maxPrice = normalizeNumberFilter(filters.maxPrice);

  if (minPrice !== null && product.price < minPrice) {
    return false;
  }

  if (maxPrice !== null && product.price > maxPrice) {
    return false;
  }

  return true;
};

const reelMatchesPriceFilter = (reel, filters = {}) => {
  if (!hasPriceFilter(filters)) {
    return true;
  }

  return reel.taggedProductIds.some((product) => productMatchesPriceFilter(product, filters));
};

const constrainStoreIds = (query, storeIds) => {
  if (!storeIds || storeIds.length === 0) {
    return storeIds ? false : true;
  }

  if (!query._id) {
    query._id = { $in: storeIds };
    return true;
  }

  const existingIds = query._id.$in || [query._id];
  const allowedIds = new Set(storeIds.map((storeId) => storeId.toString()));
  const intersection = existingIds.filter((storeId) => allowedIds.has(storeId.toString()));

  if (intersection.length === 0) {
    return false;
  }

  query._id = { $in: intersection };
  return true;
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

const buildStoreFilters = (filters = {}) => {
  const query = {};
  const sellerId = normalizeIdFilter(filters, 'seller', 'sellerId');
  const storeId = normalizeIdFilter(filters, 'store', 'storeId');

  ['category', 'region', 'city', 'state'].forEach((field) => {
    if (filters[field]) {
      query[field] = exactTextFilter(filters[field]);
    }
  });

  if (sellerId) {
    query.sellerId = sellerId;
  }

  if (storeId) {
    query._id = storeId;
  }

  return query;
};

const getStoreIdsForFilters = async (filters = {}) => {
  const storeId = normalizeIdFilter(filters, 'store', 'storeId');
  const needsStoreLookup = Boolean(filters.city || filters.state || storeId);

  if (!needsStoreLookup) {
    return null;
  }

  const storeQuery = {};

  if (filters.city) {
    storeQuery.city = exactTextFilter(filters.city);
  }

  if (filters.state) {
    storeQuery.state = exactTextFilter(filters.state);
  }

  if (storeId) {
    storeQuery._id = storeId;
  }

  return Store.find(storeQuery).distinct('_id');
};

const getStoreIdsForSearchTerm = async (q) => {
  if (!q) {
    return [];
  }

  const regex = makeSearchRegex(q);
  const sellerIds = await User.find({
    role: 'seller',
    name: regex
  }).distinct('_id');
  const searchConditions = [
    { storeName: regex },
    { city: regex },
    { state: regex },
    { region: regex },
    { category: regex }
  ];

  if (sellerIds.length > 0) {
    searchConditions.push({ sellerId: { $in: sellerIds } });
  }

  return Store.find({ $or: searchConditions }).distinct('_id');
};

const getStoreIdsForSellerStoreFilter = async (filters = {}) => {
  const sellerStore = filters.sellerStore || filters.sellerOrStore;

  if (!sellerStore) {
    return null;
  }

  const regex = makeSearchRegex(sellerStore);
  const sellerIds = await User.find({
    role: 'seller',
    name: regex
  }).distinct('_id');
  const searchConditions = [
    { storeName: regex }
  ];

  if (sellerIds.length > 0) {
    searchConditions.push({ sellerId: { $in: sellerIds } });
  }

  return Store.find({ $or: searchConditions }).distinct('_id');
};

const constrainDocumentStoreIds = (query, storeIds) => {
  if (!storeIds || storeIds.length === 0) {
    return storeIds ? false : true;
  }

  if (!query.storeId) {
    query.storeId = { $in: storeIds };
    return true;
  }

  const existingIds = query.storeId.$in || [query.storeId];
  const allowedIds = new Set(storeIds.map((storeId) => storeId.toString()));
  const intersection = existingIds.filter((storeId) => allowedIds.has(storeId.toString()));

  if (intersection.length === 0) {
    return false;
  }

  query.storeId = { $in: intersection };
  return true;
};

const buildProductFilters = async (filters = {}) => {
  const query = {
    status: { $in: PUBLIC_PRODUCT_STATUSES }
  };
  const sellerId = normalizeIdFilter(filters, 'seller', 'sellerId');
  const filteredStoreIds = await getStoreIdsForFilters(filters);
  const sellerStoreIds = await getStoreIdsForSellerStoreFilter(filters);

  if (filters.category) {
    query.category = exactTextFilter(filters.category);
  }

  if (filters.region) {
    query.region = exactTextFilter(filters.region);
  }

  if (sellerId) {
    query.sellerId = sellerId;
  }

  if (filteredStoreIds) {
    if (filteredStoreIds.length === 0) {
      return { query, empty: true };
    }

    query.storeId = { $in: filteredStoreIds };
  }

  if (sellerStoreIds && !constrainDocumentStoreIds(query, sellerStoreIds)) {
    return { query, empty: true };
  }

  const priceQuery = buildPriceQuery(filters);

  if (priceQuery) {
    query.price = priceQuery;
  }

  if (filters.q) {
    const regex = makeSearchRegex(filters.q);
    const qStoreIds = await getStoreIdsForSearchTerm(filters.q);
    const searchConditions = [
      { title: regex },
      { description: regex },
      { tags: regex }
    ];

    if (qStoreIds.length > 0) {
      searchConditions.push({ storeId: { $in: qStoreIds } });
    }

    query.$or = searchConditions;
  }

  return { query };
};

const buildReelFilters = async (filters = {}) => {
  const query = {
    status: 'active'
  };
  const sellerId = normalizeIdFilter(filters, 'seller', 'sellerId');
  const filteredStoreIds = await getStoreIdsForFilters(filters);
  const sellerStoreIds = await getStoreIdsForSellerStoreFilter(filters);

  if (filters.category) {
    query.category = exactTextFilter(filters.category);
  }

  if (filters.region) {
    query.region = exactTextFilter(filters.region);
  }

  if (sellerId) {
    query.sellerId = sellerId;
  }

  if (filteredStoreIds) {
    if (filteredStoreIds.length === 0) {
      return { query, empty: true };
    }

    query.storeId = { $in: filteredStoreIds };
  }

  if (sellerStoreIds && !constrainDocumentStoreIds(query, sellerStoreIds)) {
    return { query, empty: true };
  }

  if (filters.q) {
    const regex = makeSearchRegex(filters.q);
    const qStoreIds = await getStoreIdsForSearchTerm(filters.q);
    const searchConditions = [
      { caption: regex },
      { hashtags: regex }
    ];

    if (qStoreIds.length > 0) {
      searchConditions.push({ storeId: { $in: qStoreIds } });
    }

    query.$or = searchConditions;
  }

  return { query };
};

const searchStores = async (filters = {}, user = null) => {
  const query = buildStoreFilters(filters);
  const sellerStoreIds = await getStoreIdsForSellerStoreFilter(filters);
  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const viewerState = await getViewerState(user);

  if (filters.q) {
    const regex = makeSearchRegex(filters.q);
    const sellerIds = await User.find({
      role: 'seller',
      name: regex
    }).distinct('_id');

    query.$or = [
      { storeName: regex },
      { city: regex },
      { state: regex },
      { region: regex },
      { category: regex }
    ];

    if (sellerIds.length > 0) {
      query.$or.push({ sellerId: { $in: sellerIds } });
    }
  }

  if (sellerStoreIds && !constrainStoreIds(query, sellerStoreIds)) {
    return [];
  }

  if (hasPriceFilter(filters)) {
    const priceQuery = buildPriceQuery(filters);
    const productStoreIds = await Product.find({
      status: { $in: PUBLIC_PRODUCT_STATUSES },
      price: priceQuery
    }).distinct('storeId');

    if (!constrainStoreIds(query, productStoreIds)) {
      return [];
    }
  }

  const stores = await Store.find(safetyService.applySafetyQuery(query, safetyContext, {
    targetType: 'store',
    ownerField: 'sellerId'
  })).lean();

  return stores
    .map((store) => ({
      ...store,
      isSaved: viewerState.savedStoreIds.has(store._id.toString()),
      saveCount: Array.isArray(store.savedBy) ? store.savedBy.length : 0
    }))
    .sort((left, right) => {
      return Number(right.verified) - Number(left.verified)
        || right.viewCount - left.viewCount
        || right.saveCount - left.saveCount
        || new Date(right.createdAt) - new Date(left.createdAt);
    })
    .slice(0, normalizeLimit(filters.limit));
};

const countSearchProducts = async (filters = {}, user = null) => {
  const { query, empty } = await buildProductFilters(filters);

  if (empty) {
    return 0;
  }

  const safetyContext = await safetyService.getViewerSafetyContext(user);

  return Product.countDocuments(safetyService.applySafetyQuery(query, safetyContext, { targetType: 'product' }));
};

const searchProducts = async (filters = {}, user = null) => {
  const { query, empty } = await buildProductFilters(filters);

  if (empty) {
    return [];
  }

  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const viewerState = await getViewerState(user);

  const products = await Product.find(safetyService.applySafetyQuery(query, safetyContext, { targetType: 'product' }))
    .populate('storeId', 'storeName profileImageUrl verified city state region category')
    .sort({ featured: -1, clickCount: -1, saveCount: -1, createdAt: -1 })
    .limit(normalizeLimit(filters.limit))
    .lean();

  return withSavedProducts(products, viewerState.savedProductIds);
};

const searchReels = async (filters = {}, user = null) => {
  const { query, empty } = await buildReelFilters(filters);

  if (empty) {
    return [];
  }

  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const reels = await Reel.find(safetyService.applySafetyQuery(query, safetyContext, { targetType: 'reel' }))
    .populate('storeId', 'storeName profileImageUrl verified city state region')
    .populate('taggedProductIds', 'sellerId storeId title description productLink category region price stock tags imageUrls featured status saveCount clickCount createdAt')
    .sort({ viewCount: -1, likeCount: -1, createdAt: -1 })
    .limit(normalizeLimit(filters.limit))
    .lean();

  const filteredReels = reels
    .filter(hasAvailableTaggedProduct)
    .filter((reel) => reelMatchesPriceFilter(reel, filters));
  const viewerState = await getViewerState(user, filteredReels.map((reel) => reel._id));

  return withViewerReels(filteredReels, viewerState);
};

const globalSearch = async (filters = {}, user = null) => {
  const [stores, products, reels] = await Promise.all([
    searchStores(filters, user),
    searchProducts(filters, user),
    searchReels(filters, user)
  ]);

  return {
    stores,
    products,
    reels
  };
};

module.exports = {
  globalSearch,
  searchStores,
  searchProducts,
  countSearchProducts,
  searchReels
};
