const Order = require('../orders/order.model');
const Refund = require('../refunds/refund.model');
const ReturnRequest = require('../returns/return.model');
const SellerPayout = require('../finance/sellerPayout.model');
const SellerProfile = require('../sellers/sellerProfile.model');
const User = require('../users/user.model');
const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const Comment = require('../comments/comment.model');
const SupportRequest = require('../contact/supportRequest.model');
const Report = require('../safety/report.model');
const AnalyticsEvent = require('../analytics/analyticsEvent.model');

const PAID_PAYMENT_STATUSES = ['paid', 'partially_refunded', 'refunded'];
const CANCELLED_ORDER_STATUSES = ['cancelled', 'cancelled_unavailable', 'seller_rejected', 'acceptance_expired'];
const RETURN_ORDER_STATUSES = ['return_requested', 'return_approved', 'returned'];
const OPEN_SUPPORT_STATUSES = ['open', 'in_progress'];
const PENDING_REPORT_STATUSES = ['pending', 'reviewing'];
const RESOLVED_REPORT_STATUSES = ['resolved', 'dismissed'];

const toNumber = (value) => Number(value || 0);

const roundMoney = (value) => Math.round(toNumber(value) * 100) / 100;

const divide = (numerator, denominator) => {
  if (!denominator) {
    return 0;
  }

  return Math.round((toNumber(numerator) / toNumber(denominator)) * 10000) / 10000;
};

const parseDateRange = (query = {}) => {
  const range = {};

  if (query.fromDate) {
    const from = new Date(query.fromDate);
    if (!Number.isNaN(from.getTime())) {
      range.$gte = from;
    }
  }

  if (query.toDate) {
    const to = new Date(query.toDate);
    if (!Number.isNaN(to.getTime())) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.toDate)) {
        to.setHours(23, 59, 59, 999);
      }
      range.$lte = to;
    }
  }

  return Object.keys(range).length ? range : null;
};

const dateMatch = (query, field = 'createdAt') => {
  const range = parseDateRange(query);
  return range ? { [field]: range } : {};
};

const paidOrderMatch = (query = {}) => ({
  ...dateMatch(query),
  paymentStatus: { $in: PAID_PAYMENT_STATUSES }
});

const sumExpr = (field, fallback = 0) => ({ $ifNull: [`$${field}`, fallback] });

const emptyOrderMoney = () => ({
  grossMerchandiseValue: 0,
  productRevenue: 0,
  shippingCollected: 0,
  discounts: 0,
  platformCommissionEarned: 0,
  sellerEarnings: 0,
  unitsSold: 0
});

const getPaidOrderMoney = async (query = {}) => {
  const [orderTotals] = await Order.aggregate([
    { $match: paidOrderMatch(query) },
    {
      $group: {
        _id: null,
        grossMerchandiseValue: { $sum: sumExpr('finalTotal') },
        shippingCollected: { $sum: { $ifNull: ['$totalShippingAmount', '$shipping'] } },
        discounts: {
          $sum: {
            $max: [
              {
                $subtract: [
                  { $add: [sumExpr('subtotal'), sumExpr('shipping')] },
                  sumExpr('finalTotal')
                ]
              },
              0
            ]
          }
        }
      }
    }
  ]);

  const [itemTotals] = await Order.aggregate([
    { $match: paidOrderMatch(query) },
    { $unwind: '$items' },
    {
      $group: {
        _id: null,
        productRevenue: { $sum: { $ifNull: ['$items.itemSubtotal', '$items.itemTotal'] } },
        platformCommissionEarned: { $sum: sumExpr('items.platformCommissionAmount') },
        sellerEarnings: { $sum: sumExpr('items.sellerEarningsAmount') },
        unitsSold: { $sum: sumExpr('items.quantity') }
      }
    }
  ]);

  return {
    ...emptyOrderMoney(),
    ...(orderTotals || {}),
    ...(itemTotals || {})
  };
};

const getRefundAmount = async (query = {}, statuses = ['refunded']) => {
  const [row] = await Refund.aggregate([
    { $match: { ...dateMatch(query), status: { $in: statuses } } },
    { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);

  return {
    amount: row?.amount || 0,
    count: row?.count || 0
  };
};

const getPayoutAmount = async (query = {}, statuses = []) => {
  const match = { ...dateMatch(query) };
  if (statuses.length) {
    match.status = { $in: statuses };
  }

  const [row] = await SellerPayout.aggregate([
    { $match: match },
    { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);

  return {
    amount: row?.amount || 0,
    count: row?.count || 0
  };
};

const countOrders = (query, extraMatch = {}) => Order.countDocuments({
  ...dateMatch(query),
  ...extraMatch
});

const getEventCounts = async (query = {}) => {
  const rows = await AnalyticsEvent.aggregate([
    { $match: dateMatch(query) },
    { $group: { _id: '$eventType', count: { $sum: 1 } } }
  ]);

  return rows.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});
};

const mapUserLookup = (fields = {}) => ([
  {
    $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: '_id',
      as: 'user'
    }
  },
  { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'stores',
      localField: '_id',
      foreignField: 'sellerId',
      as: 'store'
    }
  },
  { $unwind: { path: '$store', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      sellerId: '$_id',
      sellerName: '$user.name',
      sellerEmail: '$user.email',
      storeName: '$store.storeName',
      ...fields
    }
  }
]);

const topSellersByField = async (query, fieldName, sortField, limit = 10) => Order.aggregate([
  { $match: paidOrderMatch(query) },
  { $unwind: '$items' },
  {
    $group: {
      _id: '$items.sellerId',
      gmv: { $sum: '$items.itemTotal' },
      commission: { $sum: '$items.platformCommissionAmount' },
      sellerEarnings: { $sum: '$items.sellerEarningsAmount' },
      unitsSold: { $sum: '$items.quantity' },
      orders: { $addToSet: '$_id' }
    }
  },
  {
    $addFields: {
      orderCount: { $size: '$orders' }
    }
  },
  { $sort: { [sortField]: -1 } },
  { $limit: limit },
  ...mapUserLookup({ [fieldName]: `$${sortField}`, gmv: 1, commission: 1, sellerEarnings: 1, unitsSold: 1, orderCount: 1 })
]);

const topProductsByOrderField = async (query, sortField, limit = 10) => Order.aggregate([
  { $match: paidOrderMatch(query) },
  { $unwind: '$items' },
  {
    $group: {
      _id: '$items.productId',
      revenue: { $sum: '$items.itemTotal' },
      unitsSold: { $sum: '$items.quantity' },
      orders: { $addToSet: '$_id' }
    }
  },
  { $addFields: { orderCount: { $size: '$orders' } } },
  { $sort: { [sortField]: -1 } },
  { $limit: limit },
  {
    $lookup: {
      from: 'products',
      localField: '_id',
      foreignField: '_id',
      as: 'product'
    }
  },
  { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      productId: '$_id',
      title: { $ifNull: ['$product.title', 'Unknown product'] },
      category: '$product.category',
      region: '$product.region',
      revenue: 1,
      unitsSold: 1,
      orderCount: 1
    }
  }
]);

const getOverview = async (query = {}) => {
  const [
    money,
    refundSummary,
    pendingPayouts,
    paidPayouts,
    totalOrders,
    paidOrders,
    failedOrders,
    awaitingSellerAcceptance,
    sellerAcceptedOrders,
    sellerRejectedOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    returnedOrders,
    refundedOrders,
    totalUsers,
    totalBuyers,
    totalSellers,
    newUsers,
    activeUsers,
    repeatBuyerRows,
    activeSellers,
    sellersWithSalesRows,
    topSellerRows,
    pendingSellerApprovals,
    suspendedSellerProfiles,
    suspendedSellerUsers,
    totalProducts,
    activeProducts,
    soldOutProducts,
    lowStockProducts,
    reelTotals,
    eventCounts,
    paymentMethods,
    failedPaymentTotals,
    openSupportRequests,
    pendingReports,
    delayedShipments
  ] = await Promise.all([
    getPaidOrderMoney(query),
    getRefundAmount(query),
    getPayoutAmount(query, ['pending', 'processing', 'held']),
    getPayoutAmount(query, ['paid']),
    countOrders(query),
    countOrders(query, { paymentStatus: { $in: PAID_PAYMENT_STATUSES } }),
    countOrders(query, { paymentStatus: 'failed' }),
    countOrders(query, { orderStatus: 'awaiting_seller_acceptance' }),
    countOrders(query, { orderStatus: { $in: ['seller_accepted', 'confirmed', 'processing'] } }),
    countOrders(query, { orderStatus: 'seller_rejected' }),
    countOrders(query, { orderStatus: 'shipped' }),
    countOrders(query, { orderStatus: 'delivered' }),
    countOrders(query, { orderStatus: { $in: CANCELLED_ORDER_STATUSES } }),
    countOrders(query, { orderStatus: { $in: RETURN_ORDER_STATUSES } }),
    countOrders(query, { paymentStatus: { $in: ['refunded', 'partially_refunded'] } }),
    User.countDocuments(),
    User.countDocuments({ role: 'buyer' }),
    User.countDocuments({ role: 'seller' }),
    User.countDocuments({ ...dateMatch(query), role: { $in: ['buyer', 'seller'] } }),
    User.countDocuments({ accountStatus: 'active' }),
    Order.aggregate([
      { $match: paidOrderMatch(query) },
      { $group: { _id: '$buyerId', orderCount: { $sum: 1 } } },
      { $match: { orderCount: { $gt: 1 } } },
      { $count: 'count' }
    ]),
    SellerProfile.countDocuments({ adminStatus: 'active' }),
    Order.aggregate([
      { $match: paidOrderMatch(query) },
      { $unwind: '$items' },
      { $group: { _id: '$items.sellerId' } },
      { $count: 'count' }
    ]),
    topSellersByField(query, 'revenue', 'gmv', 1),
    SellerProfile.countDocuments({ kycStatus: 'pending' }),
    SellerProfile.countDocuments({ adminStatus: 'suspended' }),
    User.countDocuments({ role: 'seller', accountStatus: 'suspended' }),
    Product.countDocuments(),
    Product.countDocuments({ status: 'active' }),
    Product.countDocuments({ status: 'sold_out' }),
    Product.countDocuments({ status: 'active', $expr: { $lte: ['$stock', '$lowStockThreshold'] } }),
    Reel.aggregate([
      { $match: dateMatch(query) },
      {
        $group: {
          _id: null,
          totalReels: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalLikes: { $sum: '$likeCount' },
          totalComments: { $sum: '$commentCount' }
        }
      }
    ]),
    getEventCounts(query),
    getPaymentMethods(query),
    Order.aggregate([
      { $match: { ...dateMatch(query), paymentStatus: 'failed' } },
      { $group: { _id: null, amount: { $sum: '$finalTotal' } } }
    ]),
    SupportRequest.countDocuments({ ...dateMatch(query), status: { $in: OPEN_SUPPORT_STATUSES } }),
    Report.countDocuments({ ...dateMatch(query), status: { $in: PENDING_REPORT_STATUSES } }),
    Order.countDocuments({
      ...dateMatch(query),
      orderStatus: 'shipped',
      shippedAt: { $lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      deliveredAt: null
    })
  ]);

  const reels = reelTotals[0] || {};
  const productClicks = eventCounts.product_click || 0;
  const ordersPlaced = eventCounts.order_placed || paidOrders;
  const netSales = Math.max(money.grossMerchandiseValue - refundSummary.amount, 0);
  const platformRefundAdjustments = 0;
  const paymentAmountByMethod = paymentMethods.reduce((acc, row) => {
    acc[row.method] = row.amount;
    return acc;
  }, {});

  return {
    revenue: {
      grossMerchandiseValue: roundMoney(money.grossMerchandiseValue),
      productRevenue: roundMoney(money.productRevenue),
      shippingCollected: roundMoney(money.shippingCollected),
      discounts: roundMoney(money.discounts),
      refunds: roundMoney(refundSummary.amount),
      netSales: roundMoney(netSales),
      platformCommissionEarned: roundMoney(money.platformCommissionEarned),
      sellerEarnings: roundMoney(Math.max(money.sellerEarnings - refundSummary.amount, 0)),
      pendingPayouts: roundMoney(pendingPayouts.amount),
      paidPayouts: roundMoney(paidPayouts.amount),
      netPlatformRevenue: roundMoney(Math.max(money.platformCommissionEarned - platformRefundAdjustments, 0))
    },
    orders: {
      totalOrders,
      paidOrders,
      failedOrders,
      awaitingSellerAcceptance,
      sellerAcceptedOrders,
      sellerRejectedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
      refundedOrders,
      averageOrderValue: roundMoney(divide(money.grossMerchandiseValue, paidOrders))
    },
    payments: {
      totalCaptured: roundMoney(money.grossMerchandiseValue),
      totalFailed: roundMoney(failedPaymentTotals[0]?.amount || 0),
      totalRefunded: roundMoney(refundSummary.amount),
      cardAmount: roundMoney(paymentAmountByMethod.card || 0),
      upiAmount: roundMoney(paymentAmountByMethod.UPI || paymentAmountByMethod.upi || 0),
      netbankingAmount: roundMoney(paymentAmountByMethod.netbanking || 0),
      walletAmount: roundMoney(paymentAmountByMethod.wallet || 0),
      codAmountIfAny: 0
    },
    users: {
      totalUsers,
      totalBuyers,
      totalSellers,
      newUsers,
      activeUsers,
      repeatBuyers: repeatBuyerRows[0]?.count || 0
    },
    sellers: {
      activeSellers,
      sellersWithSales: sellersWithSalesRows[0]?.count || 0,
      topSellerRevenue: roundMoney(topSellerRows[0]?.gmv || 0),
      pendingSellerApprovals,
      suspendedSellers: suspendedSellerProfiles + suspendedSellerUsers
    },
    products: {
      totalProducts,
      activeProducts,
      soldOutProducts,
      lowStockProducts,
      unitsSold: money.unitsSold
    },
    reels: {
      totalReels: reels.totalReels || 0,
      totalViews: reels.totalViews || 0,
      totalLikes: reels.totalLikes || 0,
      totalComments: reels.totalComments || 0,
      productClicksFromReels: eventCounts.product_click || 0
    },
    funnel: {
      reelViews: eventCounts.reel_view || reels.totalViews || 0,
      productClicks,
      cartAdds: eventCounts.cart_add || 0,
      checkoutStarts: eventCounts.checkout_start || 0,
      ordersPlaced,
      conversionRate: divide(ordersPlaced, productClicks || eventCounts.reel_view || reels.totalViews || 0)
    },
    operations: {
      openSupportRequests,
      pendingReports,
      delayedShipments,
      returnRate: divide(returnedOrders, deliveredOrders),
      refundRate: divide(refundedOrders, paidOrders),
      cancellationRate: divide(cancelledOrders, totalOrders)
    }
  };
};

const getPaymentMethods = async (query = {}) => {
  const rows = await Order.aggregate([
    { $match: dateMatch(query) },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        amount: {
          $sum: {
            $cond: [{ $in: ['$paymentStatus', PAID_PAYMENT_STATUSES] }, '$finalTotal', 0]
          }
        },
        failures: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'failed'] }, 1, 0]
          }
        }
      }
    },
    { $sort: { amount: -1 } }
  ]);

  return rows.map((row) => ({
    method: row._id || 'unknown',
    count: row.count,
    amount: roundMoney(row.amount),
    failureRate: divide(row.failures, row.count)
  }));
};

const getSalesTrend = async (query = {}) => {
  const interval = ['daily', 'weekly', 'monthly'].includes(query.interval) ? query.interval : 'daily';
  const format = interval === 'monthly' ? '%Y-%m' : interval === 'weekly' ? '%G-W%V' : '%Y-%m-%d';

  const [salesRows, refundRows] = await Promise.all([
    Order.aggregate([
      { $match: paidOrderMatch(query) },
      {
        $group: {
          _id: { $dateToString: { format, date: '$createdAt' } },
          GMV: { $sum: '$finalTotal' },
          orders: { $sum: 1 },
          commission: { $sum: '$totalPlatformCommission' }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Refund.aggregate([
      { $match: { ...dateMatch(query), status: 'refunded' } },
      {
        $group: {
          _id: { $dateToString: { format, date: '$createdAt' } },
          refunds: { $sum: '$amount' }
        }
      }
    ])
  ]);

  const refundsByDate = refundRows.reduce((acc, row) => {
    acc[row._id] = row.refunds;
    return acc;
  }, {});

  return salesRows.map((row) => {
    const refunds = refundsByDate[row._id] || 0;
    return {
      date: row._id,
      GMV: roundMoney(row.GMV),
      orders: row.orders,
      commission: roundMoney(row.commission),
      refunds: roundMoney(refunds),
      netSales: roundMoney(Math.max(row.GMV - refunds, 0))
    };
  });
};

const getSellerAnalytics = async (query = {}) => {
  const [
    topSellersByGMV,
    topSellersByCommission,
    sellersWithHighCancellationRate,
    sellersWithHighReturnRate,
    sellersWithDelayedShipments,
    sellersWithLowStockAccuracy
  ] = await Promise.all([
    topSellersByField(query, 'gmv', 'gmv'),
    topSellersByField(query, 'commission', 'commission'),
    sellerRateList(query, { orderStatus: { $in: CANCELLED_ORDER_STATUSES } }, 'cancellationRate'),
    sellerRateList(query, { orderStatus: { $in: RETURN_ORDER_STATUSES } }, 'returnRate'),
    sellerRateList(query, {
      orderStatus: 'shipped',
      shippedAt: { $lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      deliveredAt: null
    }, 'delayedShipmentRate'),
    sellerRateList(query, { orderStatus: { $in: ['seller_rejected', 'cancelled_unavailable'] } }, 'lowStockIssueRate')
  ]);

  return {
    topSellersByGMV,
    topSellersByCommission,
    sellersWithHighCancellationRate,
    sellersWithHighReturnRate,
    sellersWithDelayedShipments,
    sellersWithLowStockAccuracy
  };
};

const sellerRateList = async (query, flaggedMatch, rateField) => Order.aggregate([
  { $match: { ...dateMatch(query), sellerIds: { $exists: true, $ne: [] } } },
  { $unwind: '$sellerIds' },
  {
    $group: {
      _id: '$sellerIds',
      totalOrders: { $sum: 1 },
      flaggedOrders: {
        $sum: {
          $cond: [
            {
              $and: Object.entries(flaggedMatch).map(([field, expected]) => {
                if (expected && typeof expected === 'object' && expected.$in) {
                  return { $in: [`$${field}`, expected.$in] };
                }
                if (expected && typeof expected === 'object' && expected.$lte) {
                  return { $lte: [`$${field}`, expected.$lte] };
                }
                if (expected === null) {
                  return { $eq: [`$${field}`, null] };
                }
                return { $eq: [`$${field}`, expected] };
              })
            },
            1,
            0
          ]
        }
      }
    }
  },
  { $match: { flaggedOrders: { $gt: 0 } } },
  {
    $addFields: {
      [rateField]: { $divide: ['$flaggedOrders', '$totalOrders'] }
    }
  },
  { $sort: { [rateField]: -1, flaggedOrders: -1 } },
  { $limit: 10 },
  ...mapUserLookup({ totalOrders: 1, flaggedOrders: 1, [rateField]: 1 })
]);

const getProductAnalytics = async (query = {}) => {
  const [
    topProductsByRevenue,
    topProductsByUnitsSold,
    topProductsByClicks,
    lowStockProducts,
    highReturnProducts
  ] = await Promise.all([
    topProductsByOrderField(query, 'revenue'),
    topProductsByOrderField(query, 'unitsSold'),
    Product.find({}, 'title category region clickCount stock lowStockThreshold status')
      .sort({ clickCount: -1 })
      .limit(10)
      .lean(),
    Product.find({ status: 'active', $expr: { $lte: ['$stock', '$lowStockThreshold'] } }, 'title category region stock lowStockThreshold')
      .sort({ stock: 1 })
      .limit(25)
      .lean(),
    ReturnRequest.aggregate([
      { $match: dateMatch(query, 'requestedAt') },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          returnCount: { $sum: 1 },
          refundAmount: { $sum: '$items.refundAmount' }
        }
      },
      { $sort: { returnCount: -1, refundAmount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          title: { $ifNull: ['$product.title', 'Unknown product'] },
          returnCount: 1,
          refundAmount: 1
        }
      }
    ])
  ]);

  return {
    topProductsByRevenue,
    topProductsByUnitsSold,
    topProductsByClicks: topProductsByClicks.map((product) => ({
      productId: product._id,
      title: product.title,
      category: product.category,
      region: product.region,
      clicks: product.clickCount || 0
    })),
    lowStockProducts,
    highReturnProducts
  };
};

const getReelAnalytics = async (query = {}) => {
  const [
    topReelsByViews,
    topReelsByProductClicks,
    topReelsBySalesAttribution,
    reportedReels
  ] = await Promise.all([
    Reel.find(dateMatch(query), 'caption storeId sellerId viewCount likeCount commentCount status')
      .sort({ viewCount: -1 })
      .limit(10)
      .populate('storeId', 'storeName')
      .lean(),
    eventEntityRanking(query, 'product_click', 'reelId', 'reels', 'caption'),
    eventEntityRanking(query, 'order_placed', 'reelId', 'reels', 'caption'),
    Report.find({ ...dateMatch(query), targetType: 'reel' })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean()
  ]);

  return {
    topReelsByViews,
    topReelsByProductClicks,
    topReelsBySalesAttribution,
    reportedReels
  };
};

const eventEntityRanking = async (query, eventType, idField, collection, labelField, limit = 10) => AnalyticsEvent.aggregate([
  { $match: { ...dateMatch(query), eventType, [idField]: { $ne: null } } },
  { $group: { _id: `$${idField}`, count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: limit },
  {
    $lookup: {
      from: collection,
      localField: '_id',
      foreignField: '_id',
      as: 'entity'
    }
  },
  { $unwind: { path: '$entity', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      id: '$_id',
      count: 1,
      label: `$entity.${labelField}`
    }
  }
]);

const getRegionAnalytics = async (query = {}) => {
  const [topRegionsBySales, topCities, topStates, topCategories] = await Promise.all([
    Order.aggregate([
      { $match: paidOrderMatch(query) },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$product.region', sales: { $sum: '$items.itemTotal' }, orders: { $addToSet: '$_id' } } },
      { $project: { _id: 0, region: { $ifNull: ['$_id', 'Unknown'] }, sales: 1, orders: { $size: '$orders' } } },
      { $sort: { sales: -1 } },
      { $limit: 10 }
    ]),
    orderLocationRanking(query, 'shippingInfo.city', 'city'),
    orderLocationRanking(query, 'shippingInfo.state', 'state'),
    Order.aggregate([
      { $match: paidOrderMatch(query) },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$product.category', sales: { $sum: '$items.itemTotal' }, unitsSold: { $sum: '$items.quantity' } } },
      { $project: { _id: 0, category: { $ifNull: ['$_id', 'Unknown'] }, sales: 1, unitsSold: 1 } },
      { $sort: { sales: -1 } },
      { $limit: 10 }
    ])
  ]);

  return {
    topRegionsBySales,
    topCities,
    topStates,
    topCategories
  };
};

const orderLocationRanking = (query, field, label) => Order.aggregate([
  { $match: paidOrderMatch(query) },
  {
    $group: {
      _id: `$${field}`,
      sales: { $sum: '$finalTotal' },
      orders: { $sum: 1 }
    }
  },
  {
    $project: {
      _id: 0,
      [label]: { $ifNull: ['$_id', 'Unknown'] },
      sales: 1,
      orders: 1
    }
  },
  { $sort: { sales: -1 } },
  { $limit: 10 }
]);

const getPayoutAnalytics = async (query = {}) => {
  const [statusRows, trendRows] = await Promise.all([
    SellerPayout.aggregate([
      { $match: dateMatch(query) },
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
    ]),
    SellerPayout.aggregate([
      { $match: dateMatch(query) },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const byStatus = statusRows.reduce((acc, row) => {
    acc[row._id] = {
      count: row.count,
      amount: roundMoney(row.amount)
    };
    return acc;
  }, {});

  return {
    pendingPayouts: byStatus.pending || { count: 0, amount: 0 },
    eligiblePayouts: byStatus.processing || { count: 0, amount: 0 },
    paidPayouts: byStatus.paid || { count: 0, amount: 0 },
    failedPayouts: byStatus.failed || { count: 0, amount: 0 },
    payoutTrend: trendRows.map((row) => ({
      date: row._id,
      amount: roundMoney(row.amount),
      count: row.count
    }))
  };
};

const getRefundReturnAnalytics = async (query = {}) => {
  const [
    refundSummary,
    returnCount,
    topReturnReasons,
    topRefundReasons,
    sellersWithMostReturns,
    productsWithMostReturns
  ] = await Promise.all([
    getRefundAmount(query),
    ReturnRequest.countDocuments(dateMatch(query, 'requestedAt')),
    reasonRanking(ReturnRequest, query, 'reason', 'requestedAt'),
    reasonRanking(Refund, query, 'reason', 'createdAt'),
    ReturnRequest.aggregate([
      { $match: dateMatch(query, 'requestedAt') },
      { $group: { _id: '$sellerId', returnCount: { $sum: 1 }, refundAmount: { $sum: '$refundAmount' } } },
      { $sort: { returnCount: -1, refundAmount: -1 } },
      { $limit: 10 },
      ...mapUserLookup({ returnCount: 1, refundAmount: 1 })
    ]),
    ReturnRequest.aggregate([
      { $match: dateMatch(query, 'requestedAt') },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', returnCount: { $sum: 1 }, refundAmount: { $sum: '$items.refundAmount' } } },
      { $sort: { returnCount: -1, refundAmount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, productId: '$_id', title: '$product.title', returnCount: 1, refundAmount: 1 } }
    ])
  ]);

  return {
    refundAmount: roundMoney(refundSummary.amount),
    refundCount: refundSummary.count,
    returnCount,
    topReturnReasons,
    topRefundReasons,
    sellersWithMostReturns,
    productsWithMostReturns
  };
};

const reasonRanking = (Model, query, field, dateField) => Model.aggregate([
  { $match: dateMatch(query, dateField) },
  { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  { $project: { _id: 0, reason: { $ifNull: ['$_id', 'unspecified'] }, count: 1 } },
  { $sort: { count: -1 } },
  { $limit: 10 }
]);

const getSupportModerationAnalytics = async (query = {}) => {
  const [
    openSupportRequests,
    resolvedRequests,
    pendingReports,
    resolvedReports,
    bannedUsers,
    hiddenProducts,
    hiddenReels,
    hiddenComments
  ] = await Promise.all([
    SupportRequest.countDocuments({ ...dateMatch(query), status: { $in: OPEN_SUPPORT_STATUSES } }),
    SupportRequest.countDocuments({ ...dateMatch(query), status: 'resolved' }),
    Report.countDocuments({ ...dateMatch(query), status: { $in: PENDING_REPORT_STATUSES } }),
    Report.countDocuments({ ...dateMatch(query), status: { $in: RESOLVED_REPORT_STATUSES } }),
    User.countDocuments({ accountStatus: 'banned' }),
    Product.countDocuments({ status: 'hidden' }),
    Reel.countDocuments({ status: 'hidden' }),
    Comment.countDocuments({ status: 'hidden' })
  ]);

  return {
    openSupportRequests,
    resolvedRequests,
    pendingReports,
    resolvedReports,
    bannedUsers,
    hiddenProducts,
    hiddenReels,
    hiddenComments
  };
};

module.exports = {
  getOverview,
  getSalesTrend,
  getPaymentMethods,
  getSellerAnalytics,
  getProductAnalytics,
  getReelAnalytics,
  getRegionAnalytics,
  getPayoutAnalytics,
  getRefundReturnAnalytics,
  getSupportModerationAnalytics
};
