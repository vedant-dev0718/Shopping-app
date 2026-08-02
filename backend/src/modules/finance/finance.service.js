const mongoose = require('mongoose');

const AppError = require('../../utils/AppError');
const {
  PLATFORM_COMMISSION_PERCENTAGE,
  calculateCommission,
  normalizePercentage,
  roundMoney
} = require('../../config/commissionConfig');
const AnalyticsEvent = require('../analytics/analyticsEvent.model');
const Order = require('../orders/order.model');
const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const SellerProfile = require('../sellers/sellerProfile.model');
const Store = require('../stores/store.model');
const User = require('../users/user.model');
const CommissionSetting = require('./commissionSetting.model');
const SellerEarning = require('./sellerEarning.model');
const SellerPayout = require('./sellerPayout.model');

const DAY_MS = 24 * 60 * 60 * 1000;
const RETURN_WINDOW_DAYS = 7;

const toObjectId = (id) => new mongoose.Types.ObjectId(id.toString());
const safeDivide = (numerator, denominator) => denominator > 0 ? numerator / denominator : 0;
const percentage = (numerator, denominator) => roundMoney(safeDivide(numerator, denominator) * 100);

const buildDateQuery = ({ fromDate, toDate } = {}) => {
  const range = {};

  if (fromDate) {
    range.$gte = new Date(fromDate);
  }

  if (toDate) {
    range.$lte = new Date(toDate);
  }

  return Object.keys(range).length > 0 ? range : null;
};

const getDateMatch = (filters = {}, field = 'createdAt') => {
  const range = buildDateQuery(filters);
  return range ? { [field]: range } : {};
};

const getCommissionSettings = async () => {
  const setting = await CommissionSetting.findOne().sort({ updatedAt: -1 }).lean();

  return setting || {
    globalCommissionPercentage: PLATFORM_COMMISSION_PERCENTAGE,
    sellerOverrides: [],
    categoryOverrides: []
  };
};

const updateCommissionSettings = async (adminId, data = {}) => {
  const globalCommissionPercentage = normalizePercentage(
    data.globalCommissionPercentage,
    PLATFORM_COMMISSION_PERCENTAGE
  );
  const sellerOverrides = Array.isArray(data.sellerOverrides)
    ? data.sellerOverrides
      .filter((override) => override.sellerId && Number.isFinite(Number(override.commissionPercentage)))
      .map((override) => ({
        sellerId: override.sellerId,
        commissionPercentage: normalizePercentage(override.commissionPercentage, globalCommissionPercentage)
      }))
    : [];

  const setting = await CommissionSetting.findOneAndUpdate(
    {},
    {
      globalCommissionPercentage,
      sellerOverrides,
      categoryOverrides: Array.isArray(data.categoryOverrides) ? data.categoryOverrides : [],
      updatedBy: adminId
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  await Promise.all(sellerOverrides.map((override) => SellerProfile.findOneAndUpdate(
    { userId: override.sellerId },
    { commissionPercentageOverride: override.commissionPercentage }
  )));

  return setting;
};

const getCommissionPercentageForSeller = async (sellerId) => {
  const [settings, profile] = await Promise.all([
    getCommissionSettings(),
    SellerProfile.findOne({ userId: sellerId }).select('commissionPercentageOverride').lean()
  ]);
  const override = settings.sellerOverrides.find((entry) => entry.sellerId.toString() === sellerId.toString());

  return normalizePercentage(
    override?.commissionPercentage ?? profile?.commissionPercentageOverride,
    settings.globalCommissionPercentage
  );
};

const applyFinancialsToOrderItems = async (items = []) => {
  const commissionCache = new Map();

  return Promise.all(items.map(async (item) => {
    const sellerId = item.sellerId.toString();

    if (!commissionCache.has(sellerId)) {
      commissionCache.set(sellerId, await getCommissionPercentageForSeller(sellerId));
    }

    const commissionPercentage = commissionCache.get(sellerId);
    const itemSubtotal = roundMoney(item.itemTotal ?? ((item.quantity || 0) * (item.priceSnapshot || 0)));
    const commission = calculateCommission(itemSubtotal, commissionPercentage);

    return {
      ...item,
      itemSubtotal,
      itemTotal: item.itemTotal ?? itemSubtotal,
      commissionPercentage,
      platformCommissionAmount: commission.commissionAmount,
      sellerEarningsAmount: commission.sellerPayoutAmount,
      refundAmount: item.refundAmount || 0,
      payoutStatus: item.payoutStatus || 'pending',
      status: item.status || item.itemStatus || 'placed'
    };
  }));
};

const summarizeOrderFinancials = (items = [], shipping = 0, refundedAmount = 0) => {
  const totalProductAmount = roundMoney(items.reduce((total, item) => total + (item.itemSubtotal || item.itemTotal || 0), 0));
  const totalPlatformCommission = roundMoney(items.reduce((total, item) => total + (item.platformCommissionAmount || 0), 0));
  const totalSellerEarnings = roundMoney(items.reduce((total, item) => total + (item.sellerEarningsAmount || 0), 0));

  return {
    totalProductAmount,
    totalShippingAmount: roundMoney(shipping || 0),
    totalPlatformCommission,
    totalSellerEarnings,
    totalRefundedAmount: roundMoney(refundedAmount || 0),
    totalNetAmount: roundMoney(totalProductAmount + (shipping || 0) - (refundedAmount || 0))
  };
};

const syncOrderFinancialTotals = async (order) => {
  const totals = summarizeOrderFinancials(order.items || [], order.shipping || 0, order.totalRefundedAmount || 0);
  Object.assign(order, totals);
  order.commissionAmount = totals.totalPlatformCommission;
  order.sellerPayoutAmount = totals.totalSellerEarnings;
  order.commissionRate = totals.totalProductAmount > 0
    ? roundMoney((totals.totalPlatformCommission / totals.totalProductAmount))
    : 0;
  await order.save();
  return order;
};

const createEarningsForOrder = async (order) => {
  const ops = [];

  for (const item of order.items || []) {
    const grossAmount = roundMoney(item.itemSubtotal || item.itemTotal || 0);
    const refundAmount = roundMoney(item.refundAmount || 0);
    const netEarnings = roundMoney((item.sellerEarningsAmount || 0) - refundAmount);

    ops.push(SellerEarning.findOneAndUpdate(
      {
        orderId: order._id,
        orderItemId: item._id
      },
      {
        sellerId: item.sellerId,
        productId: item.productId,
        storeId: item.storeId,
        quantity: item.quantity || 1,
        grossAmount,
        commissionPercentage: item.commissionPercentage || 0,
        commissionAmount: item.platformCommissionAmount || 0,
        netEarnings,
        refundAmount,
        payoutStatus: item.payoutStatus || 'pending',
        payoutId: item.payoutId || null
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    ));
  }

  return Promise.all(ops);
};

const markOrderEarningsEligible = async (order, deliveredAt = new Date()) => {
  const eligibilityDate = new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * DAY_MS);

  order.items.forEach((item) => {
    if (!['cancelled', 'returned', 'refunded'].includes(item.itemStatus)) {
      item.payoutStatus = 'eligible';
      item.sellerPayoutStatus = 'released';
    }
  });

  await syncOrderFinancialTotals(order);

  return SellerEarning.updateMany(
    {
      orderId: order._id,
      payoutStatus: { $nin: ['cancelled', 'refunded', 'paid'] }
    },
    {
      payoutStatus: 'eligible',
      eligibilityDate
    }
  );
};

const updateEarningsForOrderAdjustment = async (order, { status, refundAmount = 0, itemIds = [] } = {}) => {
  const itemIdSet = new Set(itemIds.map((id) => id.toString()));
  const targetItems = itemIdSet.size > 0
    ? (order.items || []).filter((item) => itemIdSet.has(item._id.toString()))
    : (order.items || []);
  const perItemRefund = targetItems.length > 0 ? roundMoney(refundAmount / targetItems.length) : 0;

  targetItems.forEach((item) => {
    const itemRefund = refundAmount > 0 ? Math.min(item.itemSubtotal || item.itemTotal || 0, perItemRefund || item.itemSubtotal || item.itemTotal || 0) : 0;
    item.refundAmount = roundMoney((item.refundAmount || 0) + itemRefund);
    item.payoutStatus = status;
  });

  order.totalRefundedAmount = roundMoney((order.totalRefundedAmount || 0) + (refundAmount || 0));
  await syncOrderFinancialTotals(order);

  await Promise.all(targetItems.map((item) => SellerEarning.findOneAndUpdate(
    {
      orderId: order._id,
      orderItemId: item._id
    },
    {
      refundAmount: item.refundAmount || 0,
      netEarnings: roundMoney((item.sellerEarningsAmount || 0) - (item.refundAmount || 0)),
      payoutStatus: status
    },
    {
      new: true
    }
  )));
};

const earningSummary = async (sellerId, filters = {}) => {
  const match = {
    sellerId: toObjectId(sellerId),
    ...getDateMatch(filters)
  };
  const rows = await SellerEarning.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$payoutStatus',
        gross: { $sum: '$grossAmount' },
        commission: { $sum: '$commissionAmount' },
        net: { $sum: '$netEarnings' },
        refunds: { $sum: '$refundAmount' },
        count: { $sum: 1 }
      }
    }
  ]);
  const totals = {
    grossSales: 0,
    platformCommission: 0,
    netEarnings: 0,
    refundedAmount: 0,
    pendingPayout: 0,
    eligiblePayout: 0,
    paidPayout: 0,
    heldPayout: 0
  };

  rows.forEach((row) => {
    totals.grossSales += row.gross || 0;
    totals.platformCommission += row.commission || 0;
    totals.netEarnings += row.net || 0;
    totals.refundedAmount += row.refunds || 0;

    if (row._id === 'pending') totals.pendingPayout += row.net || 0;
    if (row._id === 'eligible') totals.eligiblePayout += row.net || 0;
    if (row._id === 'paid') totals.paidPayout += row.net || 0;
    if (row._id === 'held') totals.heldPayout += row.net || 0;
  });

  Object.keys(totals).forEach((key) => {
    totals[key] = roundMoney(totals[key]);
  });

  return totals;
};

const orderMetricsForSeller = async (sellerId, filters = {}) => {
  const orders = await Order.find({
    'items.sellerId': sellerId,
    ...getDateMatch(filters)
  }).select('items orderStatus paymentStatus finalTotal totalRefundedAmount').lean();

  const sellerIdString = sellerId.toString();
  const sellerOrders = orders.map((order) => {
    const sellerItems = (order.items || []).filter((item) => item.sellerId.toString() === sellerIdString);
    const gross = sellerItems.reduce((total, item) => total + (item.itemSubtotal || item.itemTotal || 0), 0);
    const returned = sellerItems.some((item) => ['returned', 'return_requested', 'return_approved'].includes(item.itemStatus));
    const refunded = sellerItems.some((item) => (item.refundAmount || 0) > 0 || item.payoutStatus === 'refunded');
    const cancelled = sellerItems.every((item) => item.itemStatus === 'cancelled') || order.orderStatus === 'cancelled';

    return {
      gross,
      returned,
      refunded,
      cancelled,
      delivered: sellerItems.some((item) => item.itemStatus === 'delivered'),
      paid: order.paymentStatus === 'paid' || order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded'
    };
  });

  const totalOrders = sellerOrders.length;
  const paidOrders = sellerOrders.filter((order) => order.paid).length;
  const cancelledOrders = sellerOrders.filter((order) => order.cancelled).length;
  const returnedOrders = sellerOrders.filter((order) => order.returned).length;
  const refundedOrders = sellerOrders.filter((order) => order.refunded).length;
  const deliveredOrders = sellerOrders.filter((order) => order.delivered).length;
  const grossSales = sellerOrders.reduce((total, order) => total + order.gross, 0);

  return {
    totalOrders,
    paidOrders,
    cancelledOrders,
    returnedOrders,
    refundedOrders,
    deliveredOrders,
    newOrders: sellerOrders.filter((order) => order.gross > 0).length,
    averageOrderValue: roundMoney(safeDivide(grossSales, totalOrders)),
    returnRate: percentage(returnedOrders, deliveredOrders),
    refundRate: percentage(refundedOrders, paidOrders)
  };
};

const eventCountsForSeller = async (sellerId, filters = {}) => {
  const rows = await AnalyticsEvent.aggregate([
    {
      $match: {
        sellerId: toObjectId(sellerId),
        eventType: {
          $in: ['reel_view', 'product_click', 'product_save', 'cart_add', 'checkout_start', 'order_placed']
        },
        ...getDateMatch(filters)
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

const topProductsForSeller = async (sellerId, filters = {}) => {
  const productRows = await SellerEarning.aggregate([
    {
      $match: {
        sellerId: toObjectId(sellerId),
        ...getDateMatch(filters)
      }
    },
    {
      $group: {
        _id: '$productId',
        unitsSold: { $sum: '$quantity' },
        grossRevenue: { $sum: '$grossAmount' },
        netEarnings: { $sum: '$netEarnings' },
        refundedAmount: { $sum: '$refundAmount' },
        returnedCount: {
          $sum: { $cond: [{ $eq: ['$payoutStatus', 'refunded'] }, 1, 0] }
        }
      }
    },
    { $sort: { grossRevenue: -1 } },
    { $limit: 10 }
  ]);
  const productIds = productRows.map((row) => row._id);
  const [products, eventRows] = await Promise.all([
    Product.find({ _id: { $in: productIds } }).select('title imageUrls category region clickCount saveCount').lean(),
    AnalyticsEvent.aggregate([
      {
        $match: {
          sellerId: toObjectId(sellerId),
          productId: { $in: productIds },
          eventType: { $in: ['product_click', 'product_save', 'cart_add'] },
          ...getDateMatch(filters)
        }
      },
      {
        $group: {
          _id: { productId: '$productId', eventType: '$eventType' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const eventMap = eventRows.reduce((map, row) => {
    const key = row._id.productId.toString();
    const counts = map.get(key) || {};
    counts[row._id.eventType] = row.count;
    map.set(key, counts);
    return map;
  }, new Map());

  return productRows.map((row) => {
    const product = productMap.get(row._id.toString());
    const events = eventMap.get(row._id.toString()) || {};

    return {
      productId: row._id,
      title: product?.title || 'Deleted product',
      imageUrl: product?.imageUrls?.[0] || '',
      category: product?.category || '',
      region: product?.region || '',
      clicks: events.product_click || product?.clickCount || 0,
      saves: events.product_save || product?.saveCount || 0,
      cartAdds: events.cart_add || 0,
      unitsSold: row.unitsSold || 0,
      grossRevenue: roundMoney(row.grossRevenue || 0),
      netEarnings: roundMoney(row.netEarnings || 0),
      refundRate: percentage(row.refundedAmount || 0, row.grossRevenue || 0),
      returnRate: percentage(row.returnedCount || 0, row.unitsSold || 0)
    };
  });
};

const topReelsForSeller = async (sellerId, filters = {}) => {
  const reels = await Reel.find({ sellerId })
    .sort({ viewCount: -1, likeCount: -1, commentCount: -1, createdAt: -1 })
    .limit(10)
    .lean();
  const reelIds = reels.map((reel) => reel._id);
  const productIds = reels.flatMap((reel) => reel.taggedProductIds || []);
  const eventRows = await AnalyticsEvent.aggregate([
    {
      $match: {
        sellerId: toObjectId(sellerId),
        $or: [
          { reelId: { $in: reelIds } },
          { productId: { $in: productIds } }
        ],
        eventType: { $in: ['reel_view', 'reel_like', 'product_click', 'cart_add', 'order_placed'] },
        ...getDateMatch(filters)
      }
    },
    {
      $group: {
        _id: { reelId: '$reelId', productId: '$productId', eventType: '$eventType' },
        count: { $sum: 1 }
      }
    }
  ]);

  return reels.map((reel) => {
    const taggedIds = new Set((reel.taggedProductIds || []).map((id) => id.toString()));
    const counts = {
      views: reel.viewCount || 0,
      likes: reel.likeCount || 0,
      comments: reel.commentCount || 0,
      productClicks: 0,
      cartAdds: 0,
      attributedSales: 0
    };

    eventRows.forEach((row) => {
      const reelMatches = row._id.reelId && row._id.reelId.toString() === reel._id.toString();
      const productMatches = row._id.productId && taggedIds.has(row._id.productId.toString());

      if (!reelMatches && !productMatches) {
        return;
      }

      if (row._id.eventType === 'reel_view') counts.views = row.count;
      if (row._id.eventType === 'reel_like') counts.likes = row.count;
      if (row._id.eventType === 'product_click') counts.productClicks += row.count;
      if (row._id.eventType === 'cart_add') counts.cartAdds += row.count;
      if (row._id.eventType === 'order_placed') counts.attributedSales += row.count;
    });

    return {
      reelId: reel._id,
      caption: reel.caption || '',
      thumbnailUrl: reel.thumbnailUrl || '',
      views: counts.views,
      likes: counts.likes,
      comments: counts.comments,
      productClicks: counts.productClicks,
      cartAdds: counts.cartAdds,
      attributedSales: counts.attributedSales
    };
  });
};

const getSellerAnalyticsOverview = async (sellerId, filters = {}) => {
  const [earnings, orders, events, topProducts, topReels, commissionPercentage] = await Promise.all([
    earningSummary(sellerId, filters),
    orderMetricsForSeller(sellerId, filters),
    eventCountsForSeller(sellerId, filters),
    topProductsForSeller(sellerId, filters),
    topReelsForSeller(sellerId, filters),
    getCommissionPercentageForSeller(sellerId)
  ]);
  const ordersPlaced = events.order_placed || orders.paidOrders || 0;

  return {
    ...earnings,
    ...orders,
    commissionPercentage,
    returnAmount: earnings.refundedAmount,
    cancelledAmount: roundMoney(orders.cancelledOrders > 0 ? earnings.refundedAmount : 0),
    conversionRate: percentage(ordersPlaced, events.product_click || 0),
    cartConversionRate: percentage(ordersPlaced, events.cart_add || 0),
    productClicks: events.product_click || 0,
    productSaves: events.product_save || 0,
    reelViews: events.reel_view || 0,
    cartAdds: events.cart_add || 0,
    checkoutStarts: events.checkout_start || 0,
    ordersPlaced,
    topProducts,
    topReels,
    topProduct: topProducts[0] || null,
    topReel: topReels[0] || null
  };
};

const getSalesTrend = async (sellerId, filters = {}, interval = 'daily') => {
  const dateFormat = interval === 'monthly' ? '%Y-%m' : interval === 'weekly' ? '%G-W%V' : '%Y-%m-%d';
  return SellerEarning.aggregate([
    {
      $match: {
        sellerId: toObjectId(sellerId),
        ...getDateMatch(filters)
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        grossSales: { $sum: '$grossAmount' },
        netEarnings: { $sum: '$netEarnings' },
        platformCommission: { $sum: '$commissionAmount' },
        refundedAmount: { $sum: '$refundAmount' },
        orders: { $addToSet: '$orderId' }
      }
    },
    { $sort: { _id: 1 } }
  ]).then((rows) => rows.map((row) => ({
    period: row._id,
    grossSales: roundMoney(row.grossSales || 0),
    netEarnings: roundMoney(row.netEarnings || 0),
    platformCommission: roundMoney(row.platformCommission || 0),
    refundedAmount: roundMoney(row.refundedAmount || 0),
    orderCount: row.orders.length
  })));
};

const getSellerCommission = async (sellerId, filters = {}) => {
  const summary = await earningSummary(sellerId, filters);
  const commissionPercentage = await getCommissionPercentageForSeller(sellerId);

  return {
    grossSales: summary.grossSales,
    commissionPercentage,
    commissionAmount: summary.platformCommission,
    netEarnings: summary.netEarnings,
    refundedAdjustments: summary.refundedAmount
  };
};

const getSellerPayouts = async (sellerId, filters = {}) => {
  const [summary, history] = await Promise.all([
    earningSummary(sellerId, filters),
    SellerPayout.find({ sellerId, ...getDateMatch(filters) }).sort({ createdAt: -1 }).lean()
  ]);

  return {
    pendingEarnings: summary.pendingPayout,
    eligibleEarnings: summary.eligiblePayout,
    paidEarnings: summary.paidPayout,
    heldEarnings: summary.heldPayout,
    payoutHistory: history
  };
};

const getPlatformAnalytics = async (filters = {}) => {
  const [earnings, totalOrders, activeSellers, topSellers, topCategories, refunds] = await Promise.all([
    SellerEarning.aggregate([
      { $match: getDateMatch(filters) },
      {
        $group: {
          _id: null,
          gmv: { $sum: '$grossAmount' },
          commission: { $sum: '$commissionAmount' },
          sellerEarnings: { $sum: '$netEarnings' },
          refunds: { $sum: '$refundAmount' }
        }
      }
    ]),
    Order.countDocuments(getDateMatch(filters)),
    User.countDocuments({ role: 'seller' }),
    SellerEarning.aggregate([
      { $match: getDateMatch(filters) },
      {
        $group: {
          _id: '$sellerId',
          grossSales: { $sum: '$grossAmount' },
          netEarnings: { $sum: '$netEarnings' },
          commission: { $sum: '$commissionAmount' }
        }
      },
      { $sort: { grossSales: -1 } },
      { $limit: 10 }
    ]),
    Product.aggregate([
      {
        $group: {
          _id: '$category',
          productCount: { $sum: 1 }
        }
      },
      { $sort: { productCount: -1 } },
      { $limit: 10 }
    ]),
    SellerEarning.countDocuments({ refundAmount: { $gt: 0 }, ...getDateMatch(filters) })
  ]);
  const totals = earnings[0] || {};

  return {
    totalGMV: roundMoney(totals.gmv || 0),
    totalPlatformCommission: roundMoney(totals.commission || 0),
    totalSellerEarnings: roundMoney(totals.sellerEarnings || 0),
    totalRefunds: roundMoney(totals.refunds || 0),
    totalOrders,
    activeSellers,
    refundedLineItems: refunds,
    topSellers,
    topCategories
  };
};

const generatePayoutNumber = (sellerId) => `NWP-${sellerId.toString().slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

const createSellerPayout = async (sellerId, data = {}) => {
  const query = {
    sellerId,
    payoutStatus: 'eligible'
  };
  const periodRange = buildDateQuery({ fromDate: data.periodStart, toDate: data.periodEnd });

  if (periodRange) {
    query.createdAt = periodRange;
  }

  const eligibleEarnings = await SellerEarning.find(query);
  const amount = roundMoney(eligibleEarnings.reduce((total, earning) => total + (earning.netEarnings || 0), 0));

  if (amount <= 0) {
    throw new AppError('No eligible earnings found for this seller', 400);
  }

  const payout = await SellerPayout.create({
    sellerId,
    payoutNumber: generatePayoutNumber(sellerId),
    amount,
    periodStart: data.periodStart || null,
    periodEnd: data.periodEnd || null,
    status: 'pending',
    paymentMethod: data.paymentMethod || '',
    notes: data.notes || ''
  });

  await SellerEarning.updateMany(
    { _id: { $in: eligibleEarnings.map((earning) => earning._id) } },
    {
      payoutStatus: 'held',
      payoutId: payout._id
    }
  );

  return payout;
};

const markPayoutStatus = async (payoutId, status, data = {}) => {
  const payout = await SellerPayout.findById(payoutId);

  if (!payout) {
    throw new AppError('Payout not found', 404);
  }

  payout.status = status;
  payout.transactionReference = data.transactionReference || payout.transactionReference;
  payout.notes = data.notes || payout.notes;
  payout.paidAt = status === 'paid' ? new Date() : payout.paidAt;
  await payout.save();

  if (status === 'paid') {
    await SellerEarning.updateMany(
      { payoutId: payout._id },
      {
        payoutStatus: 'paid',
        paidAt: payout.paidAt
      }
    );
  } else if (status === 'failed') {
    await SellerEarning.updateMany(
      { payoutId: payout._id, payoutStatus: 'held' },
      { payoutStatus: 'eligible', payoutId: null }
    );
  }

  return payout;
};

const listAdminPayouts = async (filters = {}) => SellerPayout.find(getDateMatch(filters))
  .populate('sellerId', 'name email')
  .sort({ createdAt: -1 })
  .lean();

module.exports = {
  RETURN_WINDOW_DAYS,
  applyFinancialsToOrderItems,
  summarizeOrderFinancials,
  syncOrderFinancialTotals,
  createEarningsForOrder,
  markOrderEarningsEligible,
  updateEarningsForOrderAdjustment,
  getCommissionSettings,
  updateCommissionSettings,
  getCommissionPercentageForSeller,
  getSellerAnalyticsOverview,
  getSalesTrend,
  getSellerCommission,
  getSellerPayouts,
  topProductsForSeller,
  topReelsForSeller,
  getPlatformAnalytics,
  createSellerPayout,
  markPayoutStatus,
  listAdminPayouts
};
