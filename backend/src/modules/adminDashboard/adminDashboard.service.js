const User = require('../users/user.model');
const Store = require('../stores/store.model');
const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const Comment = require('../comments/comment.model');
const Order = require('../orders/order.model');
const Refund = require('../refunds/refund.model');
const ReturnRequest = require('../returns/return.model');
const SellerEarning = require('../finance/sellerEarning.model');
const SellerPayout = require('../finance/sellerPayout.model');
const SellerProfile = require('../sellers/sellerProfile.model');
const SupportRequest = require('../contact/supportRequest.model');
const Report = require('../safety/report.model');
const BlockedUser = require('../safety/blockedUser.model');
const ModerationAction = require('../safety/moderationAction.model');

const startOfDay = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const sumOrderField = async (match, field) => {
  const [row] = await Order.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } }
  ]);

  return row?.total || 0;
};

const sumRefunds = async (match = {}) => {
  const [row] = await Refund.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return row?.total || 0;
};

const sumEarnings = async (match = {}, field = 'netEarnings') => {
  const [row] = await SellerEarning.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } }
  ]);

  return row?.total || 0;
};

const sumPayouts = async (match = {}) => {
  const [row] = await SellerPayout.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return row?.total || 0;
};

const topSellers = () => Order.aggregate([
  { $match: { paymentStatus: { $in: ['paid', 'refunded', 'partially_refunded'] } } },
  { $unwind: '$items' },
  { $match: { 'items.sellerId': { $ne: null } } },
  {
    $group: {
      _id: '$items.sellerId',
      grossSales: { $sum: { $ifNull: ['$items.itemSubtotal', { $ifNull: ['$items.itemTotal', 0] }] } },
      orders: { $addToSet: '$_id' },
      unitsSold: { $sum: { $ifNull: ['$items.quantity', 1] } },
      sellerEarnings: { $sum: { $ifNull: ['$items.sellerEarningsAmount', { $ifNull: ['$items.sellerPayoutAmount', 0] }] } }
    }
  },
  { $sort: { grossSales: -1 } },
  { $limit: 5 },
  { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'seller' } },
  { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
  { $lookup: { from: 'stores', localField: '_id', foreignField: 'sellerId', as: 'store' } },
  {
    $project: {
      sellerId: '$_id',
      name: '$seller.name',
      email: '$seller.email',
      storeName: { $ifNull: [{ $arrayElemAt: ['$store.storeName', 0] }, ''] },
      grossSales: 1,
      sellerEarnings: 1,
      orderCount: { $size: '$orders' },
      unitsSold: 1
    }
  }
]);

const topProducts = () => Order.aggregate([
  { $match: { paymentStatus: { $in: ['paid', 'refunded', 'partially_refunded'] } } },
  { $unwind: '$items' },
  { $match: { 'items.productId': { $ne: null } } },
  {
    $group: {
      _id: '$items.productId',
      revenue: { $sum: { $ifNull: ['$items.itemSubtotal', { $ifNull: ['$items.itemTotal', 0] }] } },
      unitsSold: { $sum: { $ifNull: ['$items.quantity', 1] } },
      orderCount: { $addToSet: '$_id' }
    }
  },
  { $sort: { revenue: -1 } },
  { $limit: 5 },
  { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
  { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      productId: '$_id',
      title: { $ifNull: ['$product.title', 'Unknown product'] },
      sku: '$product.sku',
      barcode: '$product.barcode',
      status: '$product.status',
      revenue: 1,
      unitsSold: 1,
      orderCount: { $size: '$orderCount' }
    }
  }
]);

const topRegions = () => Order.aggregate([
  { $match: { paymentStatus: { $in: ['paid', 'refunded', 'partially_refunded'] } } },
  {
    $group: {
      _id: { $ifNull: ['$shippingInfo.state', '$shippingInfo.city'] },
      orderCount: { $sum: 1 },
      gmv: { $sum: '$finalTotal' }
    }
  },
  { $match: { _id: { $nin: [null, ''] } } },
  { $sort: { gmv: -1 } },
  { $limit: 5 },
  { $project: { region: '$_id', orderCount: 1, gmv: 1 } }
]);

const getSummary = async () => {
  const today = startOfDay();
  const weekStart = daysAgo(7);
  const monthStart = daysAgo(30);
  const delayedShipmentCutoff = daysAgo(7);

  const [
    totalUsers,
    totalBuyers,
    totalSellers,
    activeSellers,
    totalAdmins,
    activeUsers,
    suspendedUsers,
    bannedUsers,
    newUsersToday,
    newUsersThisWeek,
    newUsersThisMonth,
    totalStores,
    verifiedStores,
    totalProducts,
    activeProducts,
    soldOutProducts,
    lowStockProducts,
    hiddenProducts,
    reportedProducts,
    totalReels,
    activeReels,
    hiddenReels,
    reportedReels,
    reelTotals,
    totalComments,
    totalOrders,
    paidOrders,
    pendingOrders,
    awaitingSellerAcceptance,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    refundedOrders,
    returnedOrders,
    grossMerchandiseValue,
    totalProductRevenue,
    totalShippingCollected,
    totalRefunds,
    platformCommissionEarned,
    sellerEarnings,
    pendingPayouts,
    paidPayouts,
    razorpayFailedAmount,
    paymentsCaptured,
    paymentsFailed,
    refundsProcessed,
    refundsPending,
    shipmentsCreated,
    shipmentsDelayed,
    shipmentsDelivered,
    shipmentsCancelled,
    openSupportRequests,
    resolvedSupportRequests,
    pendingReports,
    resolvedReports,
    blockedUsersCount,
    moderationActionsCount,
    topSellerRows,
    topProductRows,
    topReelRows,
    topRegionRows
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'buyer' }),
    User.countDocuments({ role: 'seller' }),
    User.countDocuments({ role: 'seller', accountStatus: 'active' }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ accountStatus: 'active' }),
    User.countDocuments({ accountStatus: 'suspended' }),
    User.countDocuments({ accountStatus: 'banned' }),
    User.countDocuments({ createdAt: { $gte: today } }),
    User.countDocuments({ createdAt: { $gte: weekStart } }),
    User.countDocuments({ createdAt: { $gte: monthStart } }),
    Store.countDocuments(),
    Store.countDocuments({ verified: true }),
    Product.countDocuments(),
    Product.countDocuments({ status: 'active' }),
    Product.countDocuments({ status: 'sold_out' }),
    Product.countDocuments({ status: 'active', stock: { $lte: 3, $gt: 0 } }),
    Product.countDocuments({ status: { $in: ['hidden', 'inactive'] } }),
    Report.countDocuments({ targetType: 'product', status: { $in: ['pending', 'reviewing'] } }),
    Reel.countDocuments(),
    Reel.countDocuments({ status: 'active' }),
    Reel.countDocuments({ status: 'hidden' }),
    Report.countDocuments({ targetType: 'reel', status: { $in: ['pending', 'reviewing'] } }),
    Reel.aggregate([{ $group: { _id: null, totalViews: { $sum: '$viewCount' }, totalLikes: { $sum: '$likeCount' }, totalComments: { $sum: '$commentCount' } } }]),
    Comment.countDocuments(),
    Order.countDocuments(),
    Order.countDocuments({ paymentStatus: 'paid' }),
    Order.countDocuments({ paymentStatus: { $in: ['pending', 'authorized'] } }),
    Order.countDocuments({ orderStatus: 'awaiting_seller_acceptance' }),
    Order.countDocuments({ orderStatus: 'shipped' }),
    Order.countDocuments({ orderStatus: 'delivered' }),
    Order.countDocuments({ orderStatus: { $in: ['cancelled', 'cancelled_unavailable', 'seller_rejected', 'acceptance_expired'] } }),
    Order.countDocuments({ paymentStatus: { $in: ['refunded', 'partially_refunded'] } }),
    Order.countDocuments({ orderStatus: { $in: ['returned', 'return_requested', 'return_approved'] } }),
    sumOrderField({ paymentStatus: { $in: ['paid', 'refunded', 'partially_refunded'] } }, 'finalTotal'),
    sumOrderField({}, 'totalProductAmount'),
    sumOrderField({}, 'shipping'),
    sumRefunds({ status: { $in: ['refunded', 'processing', 'pending'] } }),
    sumOrderField({}, 'totalPlatformCommission'),
    sumEarnings(),
    sumPayouts({ status: { $in: ['pending', 'processing', 'held'] } }),
    sumPayouts({ status: 'paid' }),
    sumOrderField({ paymentStatus: 'failed' }, 'finalTotal'),
    Order.countDocuments({ paymentStatus: 'paid' }),
    Order.countDocuments({ paymentStatus: 'failed' }),
    Refund.countDocuments({ status: 'refunded' }),
    Refund.countDocuments({ status: { $in: ['pending', 'processing'] } }),
    Order.countDocuments({ $or: [{ shiprocketShipmentId: { $ne: null } }, { trackingNumber: { $ne: '' } }] }),
    Order.countDocuments({
      orderStatus: 'shipped',
      shippedAt: { $lte: delayedShipmentCutoff },
      $or: [{ deliveredAt: null }, { deliveredAt: { $exists: false } }]
    }),
    Order.countDocuments({ orderStatus: 'delivered' }),
    Order.countDocuments({ orderStatus: { $in: ['cancelled', 'cancelled_unavailable', 'acceptance_expired'] } }),
    SupportRequest.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
    SupportRequest.countDocuments({ status: 'resolved' }),
    Report.countDocuments({ status: { $in: ['pending', 'reviewing'] } }),
    Report.countDocuments({ status: { $in: ['resolved', 'dismissed'] } }),
    BlockedUser.countDocuments(),
    ModerationAction.countDocuments(),
    topSellers(),
    topProducts(),
    Reel.find().select('caption sellerId storeId status viewCount likeCount commentCount createdAt').sort({ viewCount: -1, likeCount: -1 }).limit(5).lean(),
    topRegions()
  ]);

  const reelSummary = reelTotals[0] || {};
  const netRevenueAfterRefunds = Math.max(grossMerchandiseValue - totalRefunds, 0);

  return {
    users: {
      totalUsers,
      totalBuyers,
      totalSellers,
      totalAdmins,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth
    },
    sellers: {
      totalSellers,
      activeSellers,
      activeSellerProfiles: await SellerProfile.countDocuments({ kycStatus: { $in: ['approved', 'verified'] } })
    },
    stores: {
      totalStores,
      verifiedStores,
      pendingStores: Math.max(totalStores - verifiedStores, 0),
      suspendedStores: 0
    },
    products: {
      totalProducts,
      activeProducts,
      soldOutProducts,
      lowStockProducts,
      hiddenProducts,
      reportedProducts
    },
    reels: {
      totalReels,
      activeReels,
      hiddenReels,
      reportedReels,
      totalViews: reelSummary.totalViews || 0,
      totalLikes: reelSummary.totalLikes || 0,
      totalComments: reelSummary.totalComments || totalComments
    },
    orders: {
      totalOrders,
      paidOrders,
      pendingOrders,
      awaitingSellerAcceptance,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      refundedOrders,
      returnedOrders
    },
    revenue: {
      grossMerchandiseValue,
      totalProductRevenue,
      totalShippingCollected,
      totalRefunds,
      netSales: netRevenueAfterRefunds,
      netRevenueAfterRefunds,
      platformCommissionEarned,
      sellerEarnings,
      pendingPayouts,
      paidPayouts
    },
    payments: {
      razorpayPaidAmount: grossMerchandiseValue,
      razorpayFailedAmount,
      paymentsCaptured,
      paymentsFailed,
      refundsProcessed,
      refundsPending
    },
    shipping: {
      shipmentsCreated,
      shipmentsInTransit: Math.max(shipmentsCreated - shipmentsDelivered - shipmentsCancelled, 0),
      shipmentsDelivered,
      shipmentsDelayed,
      shipmentsCancelled
    },
    support: {
      openSupportRequests,
      resolvedSupportRequests
    },
    moderation: {
      pendingReports,
      resolvedReports,
      blockedUsersCount,
      moderationActionsCount
    },
    topSellers: topSellerRows,
    topProducts: topProductRows,
    topReels: topReelRows,
    topRegions: topRegionRows
  };
};

module.exports = {
  getSummary
};
