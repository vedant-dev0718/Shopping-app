const mongoose = require('mongoose');

const AppError = require('../../utils/AppError');
const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const Store = require('../stores/store.model');
const AnalyticsEvent = require('./analyticsEvent.model');

const EVENT_TYPES = [
  'reel_view',
  'product_click',
  'product_save',
  'store_view',
  'store_save',
  'cart_add',
  'checkout_start',
  'order_placed',
  'order_cancel_requested',
  'order_cancelled',
  'order_cancel_rejected',
  'return_requested',
  'return_approved',
  'return_rejected',
  'return_received',
  'refund_requested',
  'refund_processed',
  'refund_failed',
  'stock_restored',
  'order_awaiting_seller_acceptance',
  'order_seller_accepted',
  'order_seller_rejected',
  'order_acceptance_expired',
  'refund_triggered_due_to_unavailable',
  'stock_unavailable_after_order',
  'comment_added',
  'reel_like'
];

const toObjectId = (id) => new mongoose.Types.ObjectId(id.toString());

const eventCounts = async (sellerId, eventTypes) => {
  const sellerObjectId = toObjectId(sellerId);
  const rows = await AnalyticsEvent.aggregate([
    {
      $match: {
        sellerId: sellerObjectId,
        eventType: { $in: eventTypes }
      }
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 }
      }
    }
  ]);

  return rows.reduce((counts, row) => {
    counts[row._id] = row.count;
    return counts;
  }, {});
};

const hydrateContext = async (event) => {
  const nextEvent = { ...event };

  if (nextEvent.productId && (!nextEvent.sellerId || !nextEvent.storeId)) {
    const product = await Product.findById(nextEvent.productId).select('sellerId storeId');

    if (product) {
      nextEvent.sellerId = nextEvent.sellerId || product.sellerId;
      nextEvent.storeId = nextEvent.storeId || product.storeId;
    }
  }

  if (nextEvent.reelId && (!nextEvent.sellerId || !nextEvent.storeId)) {
    const reel = await Reel.findById(nextEvent.reelId).select('sellerId storeId');

    if (reel) {
      nextEvent.sellerId = nextEvent.sellerId || reel.sellerId;
      nextEvent.storeId = nextEvent.storeId || reel.storeId;
    }
  }

  if (nextEvent.storeId && !nextEvent.sellerId) {
    const store = await Store.findById(nextEvent.storeId).select('sellerId');

    if (store) {
      nextEvent.sellerId = store.sellerId;
    }
  }

  return nextEvent;
};

const trackEvent = async (event) => {
  if (!EVENT_TYPES.includes(event.eventType)) {
    throw new AppError('Invalid analytics event type', 400);
  }

  const hydratedEvent = await hydrateContext(event);

  return AnalyticsEvent.create({
    userId: hydratedEvent.userId || null,
    sellerId: hydratedEvent.sellerId || null,
    storeId: hydratedEvent.storeId || null,
    productId: hydratedEvent.productId || null,
    reelId: hydratedEvent.reelId || null,
    eventType: hydratedEvent.eventType,
    metadata: hydratedEvent.metadata || {}
  });
};

const trackEventSafe = async (event) => {
  try {
    return await trackEvent(event);
  } catch (error) {
    console.error('Analytics event failed:', error.message);
    return null;
  }
};

const getSummary = async (sellerId) => {
  const counts = await eventCounts(sellerId, [
    'reel_view',
    'store_view',
    'product_click',
    'product_save',
    'cart_add',
    'order_awaiting_seller_acceptance',
    'order_seller_accepted',
    'order_seller_rejected',
    'stock_unavailable_after_order'
  ]);
  const mockOrderIds = await AnalyticsEvent.distinct('metadata.orderId', {
    sellerId: toObjectId(sellerId),
    eventType: 'order_placed'
  });

  const ordersRequiringAcceptance = counts.order_awaiting_seller_acceptance || 0;
  const acceptedOrders = counts.order_seller_accepted || 0;
  const rejectedUnavailableOrders = counts.stock_unavailable_after_order || counts.order_seller_rejected || 0;

  return {
    totalViews: (counts.reel_view || 0) + (counts.store_view || 0),
    reelViews: counts.reel_view || 0,
    storeViews: counts.store_view || 0,
    productClicks: counts.product_click || 0,
    productSaves: counts.product_save || 0,
    cartAdds: counts.cart_add || 0,
    ordersRequiringAcceptance,
    acceptedOrders,
    rejectedUnavailableOrders,
    acceptanceRate: ordersRequiringAcceptance > 0
      ? Math.round((acceptedOrders / ordersRequiringAcceptance) * 10000) / 100
      : 0,
    stockUnavailableRate: ordersRequiringAcceptance > 0
      ? Math.round((rejectedUnavailableOrders / ordersRequiringAcceptance) * 10000) / 100
      : 0,
    mockOrders: mockOrderIds.length
  };
};

const getVideoAnalytics = async (sellerId) => {
  const sellerObjectId = toObjectId(sellerId);
  const reels = await Reel.find({ sellerId })
    .sort({ viewCount: -1, likeCount: -1, commentCount: -1, createdAt: -1 })
    .limit(10)
    .lean();
  const reelIds = reels.map((reel) => reel._id);
  const productIds = reels.flatMap((reel) => reel.taggedProductIds || []);
  const [reelViewRows, productClickRows] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: { sellerId: sellerObjectId, reelId: { $in: reelIds }, eventType: 'reel_view' } },
      { $group: { _id: '$reelId', views: { $sum: 1 } } }
    ]),
    AnalyticsEvent.aggregate([
      { $match: { sellerId: sellerObjectId, productId: { $in: productIds }, eventType: 'product_click' } },
      { $group: { _id: '$productId', clicks: { $sum: 1 } } }
    ])
  ]);
  const viewMap = new Map(reelViewRows.map((row) => [row._id.toString(), row.views]));
  const clickMap = new Map(productClickRows.map((row) => [row._id.toString(), row.clicks]));

  return reels.map((reel) => ({
    reel,
    views: viewMap.get(reel._id.toString()) || reel.viewCount || 0,
    likes: reel.likeCount || 0,
    comments: reel.commentCount || 0,
    productClicks: (reel.taggedProductIds || []).reduce((total, productId) => {
      return total + (clickMap.get(productId.toString()) || 0);
    }, 0)
  }));
};

const getProductAnalytics = async (sellerId) => {
  const sellerObjectId = toObjectId(sellerId);
  const products = await Product.find({ sellerId })
    .sort({ clickCount: -1, saveCount: -1, createdAt: -1 })
    .limit(10)
    .lean();
  const productIds = products.map((product) => product._id);
  const rows = await AnalyticsEvent.aggregate([
    {
      $match: {
        sellerId: sellerObjectId,
        productId: { $in: productIds },
        eventType: { $in: ['product_click', 'product_save', 'cart_add', 'order_placed'] }
      }
    },
    {
      $group: {
        _id: {
          productId: '$productId',
          eventType: '$eventType'
        },
        count: { $sum: 1 }
      }
    }
  ]);
  const counts = rows.reduce((map, row) => {
    const productId = row._id.productId.toString();
    const current = map.get(productId) || {};
    current[row._id.eventType] = row.count;
    map.set(productId, current);
    return map;
  }, new Map());

  return products.map((product) => {
    const productCounts = counts.get(product._id.toString()) || {};

    return {
      product,
      clicks: productCounts.product_click || product.clickCount || 0,
      saves: productCounts.product_save || product.saveCount || 0,
      cartAdds: productCounts.cart_add || 0,
      mockOrders: productCounts.order_placed || 0
    };
  });
};

const getRecentUploads = async (sellerId) => {
  const [products, reels] = await Promise.all([
    Product.find({ sellerId }).sort({ createdAt: -1 }).limit(5).lean(),
    Reel.find({ sellerId }).sort({ createdAt: -1 }).limit(5).lean()
  ]);

  return [
    ...products.map((product) => ({
      type: 'product',
      createdAt: product.createdAt,
      data: product
    })),
    ...reels.map((reel) => ({
      type: 'reel',
      createdAt: reel.createdAt,
      data: reel
    }))
  ]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 10);
};

const getIntentSignals = async (sellerId) => {
  return AnalyticsEvent.find({
    sellerId,
    eventType: { $in: ['product_save', 'store_save', 'cart_add', 'checkout_start', 'order_placed', 'comment_added', 'reel_like'] }
  })
    .populate('userId', 'name email role')
    .populate('productId', 'title price category')
    .populate('reelId', 'caption category')
    .populate('storeId', 'storeName city state')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
};

const getDashboard = async (sellerId) => {
  const [productCount, videoCount, stores, summary, recentUploads, buyerInterestSignals] = await Promise.all([
    Product.countDocuments({ sellerId }),
    Reel.countDocuments({ sellerId }),
    Store.find({ sellerId }).select('viewCount savedBy').lean(),
    getSummary(sellerId),
    getRecentUploads(sellerId),
    getIntentSignals(sellerId)
  ]);

  return {
    productCount,
    videoCount,
    storeViews: stores.reduce((total, store) => total + (store.viewCount || 0), 0),
    storeSaves: stores.reduce((total, store) => total + (store.savedBy ? store.savedBy.length : 0), 0),
    buyerInterestSignalCount: buyerInterestSignals.length,
    summary,
    recentUploads,
    buyerInterestSignals
  };
};

module.exports = {
  EVENT_TYPES,
  trackEvent,
  trackEventSafe,
  getSummary,
  getVideoAnalytics,
  getProductAnalytics,
  getDashboard,
  getRecentUploads,
  getIntentSignals
};
