const BuyerProfile = require('../buyers/buyerProfile.model');
const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const AnalyticsEvent = require('../analytics/analyticsEvent.model');
const safetyService = require('../safety/safety.service');

const DEFAULT_LIMIT = 20;

const normalizeLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, 50);
};

const hasAvailableTaggedProduct = (reel) => {
  return Array.isArray(reel.taggedProductIds)
    && reel.taggedProductIds.some((product) => product && product.status === 'active' && product.stock > 0);
};

const getBuyerSignals = async (buyerId) => {
  const [profile, clickedProductEvents, viewedReelEvents] = await Promise.all([
    BuyerProfile.findOne({ userId: buyerId }).lean(),
    AnalyticsEvent.find({ userId: buyerId, eventType: 'product_click', productId: { $ne: null } })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
    AnalyticsEvent.find({ userId: buyerId, eventType: 'reel_view', reelId: { $ne: null } })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean()
  ]);

  const watchedReelIds = [
    ...((profile && profile.watchedReels) || []),
    ...viewedReelEvents.map((event) => event.reelId)
  ];
  const clickedProductIds = clickedProductEvents.map((event) => event.productId);
  const [watchedReels, clickedProducts] = await Promise.all([
    Reel.find({ _id: { $in: watchedReelIds } }).lean(),
    Product.find({ _id: { $in: clickedProductIds } }).lean()
  ]);

  return {
    savedStoreIds: ((profile && profile.savedStores) || []).map((id) => id.toString()),
    preferredRegions: new Set((profile && profile.preferredRegions) || []),
    preferredCategories: new Set((profile && profile.preferredCategories) || []),
    watchedReels,
    clickedProducts
  };
};

const hasAnyHistory = (signals) => {
  return signals.savedStoreIds.length > 0
    || signals.preferredRegions.size > 0
    || signals.preferredCategories.size > 0
    || signals.watchedReels.length > 0
    || signals.clickedProducts.length > 0;
};

const getTrendingProducts = async (limit, safetyContext = null) => {
  const context = safetyContext || { hiddenIdsByType: {}, hiddenOwnerIds: [] };

  return Product.find(safetyService.applySafetyQuery({ status: 'active', stock: { $gt: 0 } }, context, { targetType: 'product' }))
    .populate('storeId', 'storeName profileImageUrl verified city state region category')
    .sort({ clickCount: -1, saveCount: -1, featured: -1, createdAt: -1 })
    .limit(limit)
    .lean();
};

const getTrendingReels = async (limit, safetyContext = null) => {
  const context = safetyContext || { hiddenIdsByType: {}, hiddenOwnerIds: [] };
  const reels = await Reel.find(safetyService.applySafetyQuery({ status: 'active' }, context, { targetType: 'reel' }))
    .populate('storeId', 'storeName profileImageUrl verified city state region')
    .populate('taggedProductIds', 'title category region price stock status imageUrls')
    .sort({ viewCount: -1, likeCount: -1, commentCount: -1, createdAt: -1 })
    .limit(limit * 2)
    .lean();

  return reels.filter(hasAvailableTaggedProduct).slice(0, limit);
};

const scoreProduct = (product, signals) => {
  const clickedCategories = new Set(signals.clickedProducts.map((item) => item.category));
  const clickedRegions = new Set(signals.clickedProducts.map((item) => item.region));
  const watchedCategories = new Set(signals.watchedReels.map((item) => item.category));
  const watchedRegions = new Set(signals.watchedReels.map((item) => item.region));
  let score = 0;

  if (signals.savedStoreIds.includes(product.storeId._id ? product.storeId._id.toString() : product.storeId.toString())) score += 4;
  if (signals.preferredCategories.has(product.category)) score += 3;
  if (signals.preferredRegions.has(product.region)) score += 3;
  if (clickedCategories.has(product.category)) score += 2;
  if (clickedRegions.has(product.region)) score += 2;
  if (watchedCategories.has(product.category)) score += 2;
  if (watchedRegions.has(product.region)) score += 2;
  if (product.featured) score += 1;

  return score;
};

const scoreReel = (reel, signals) => {
  let score = 0;

  if (signals.savedStoreIds.includes(reel.storeId._id ? reel.storeId._id.toString() : reel.storeId.toString())) score += 4;
  if (signals.preferredCategories.has(reel.category)) score += 3;
  if (signals.preferredRegions.has(reel.region)) score += 3;
  if (signals.clickedProducts.some((product) => product.category === reel.category)) score += 2;
  if (signals.clickedProducts.some((product) => product.region === reel.region)) score += 2;

  return score;
};

const getRecommendedProducts = async (buyerId, filters = {}, user = null) => {
  const limit = normalizeLimit(filters.limit);
  const signals = await getBuyerSignals(buyerId);
  const safetyContext = await safetyService.getViewerSafetyContext(user || { id: buyerId });

  if (!hasAnyHistory(signals)) {
    return getTrendingProducts(limit, safetyContext);
  }

  const products = await Product.find(safetyService.applySafetyQuery({ status: 'active', stock: { $gt: 0 } }, safetyContext, { targetType: 'product' }))
    .populate('storeId', 'storeName profileImageUrl verified city state region category')
    .sort({ featured: -1, clickCount: -1, saveCount: -1, createdAt: -1 })
    .limit(100)
    .lean();

  const recommendedProducts = products
    .map((product) => ({
      product,
      score: scoreProduct(product, signals)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.product.clickCount - left.product.clickCount)
    .slice(0, limit)
    .map((item) => item.product);

  return recommendedProducts.length > 0 ? recommendedProducts : getTrendingProducts(limit, safetyContext);
};

const getRecommendedReels = async (buyerId, filters = {}, user = null) => {
  const limit = normalizeLimit(filters.limit);
  const signals = await getBuyerSignals(buyerId);
  const safetyContext = await safetyService.getViewerSafetyContext(user || { id: buyerId });

  if (!hasAnyHistory(signals)) {
    return getTrendingReels(limit, safetyContext);
  }

  const reels = await Reel.find(safetyService.applySafetyQuery({ status: 'active' }, safetyContext, { targetType: 'reel' }))
    .populate('storeId', 'storeName profileImageUrl verified city state region')
    .populate('taggedProductIds', 'title category region price stock status imageUrls')
    .sort({ viewCount: -1, likeCount: -1, commentCount: -1, createdAt: -1 })
    .limit(100)
    .lean();

  const recommendedReels = reels
    .filter(hasAvailableTaggedProduct)
    .map((reel) => ({
      reel,
      score: scoreReel(reel, signals)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.reel.viewCount - left.reel.viewCount)
    .slice(0, limit)
    .map((item) => item.reel);

  return recommendedReels.length > 0 ? recommendedReels : getTrendingReels(limit, safetyContext);
};

module.exports = {
  getRecommendedProducts,
  getRecommendedReels
};
