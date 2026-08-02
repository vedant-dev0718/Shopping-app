const mongoose = require('mongoose');

const User = require('../users/user.model');
const BuyerProfile = require('../buyers/buyerProfile.model');
const SellerProfile = require('../sellers/sellerProfile.model');
const Store = require('../stores/store.model');
const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const Comment = require('../comments/comment.model');
const Order = require('../orders/order.model');
const Refund = require('../refunds/refund.model');
const ReturnRequest = require('../returns/return.model');
const SellerEarning = require('../finance/sellerEarning.model');
const SellerPayout = require('../finance/sellerPayout.model');
const Report = require('../safety/report.model');
const BlockedUser = require('../safety/blockedUser.model');
const AdminActionLog = require('./adminActionLog.model');
const AppError = require('../../utils/AppError');

const objectId = (id) => new mongoose.Types.ObjectId(id);

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const regex = (value) => new RegExp(escapeRegex(value), 'i');

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const pagination = (query = {}) => {
  const page = Math.max(asNumber(query.page, 1), 1);
  const limit = Math.min(Math.max(asNumber(query.limit, 20), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const dateRange = (query = {}) => {
  const createdAt = {};
  if (query.fromDate) createdAt.$gte = new Date(query.fromDate);
  if (query.toDate) createdAt.$lte = new Date(query.toDate);
  return Object.keys(createdAt).length ? { createdAt } : {};
};

const sortMap = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  title: { title: 1 },
  price_high: { price: -1 },
  price_low: { price: 1 },
  stock_low: { stock: 1 },
  views: { viewCount: -1 },
  sales: { totalSales: -1 }
};

const sortFor = (sortBy, fallback = { createdAt: -1 }) => sortMap[sortBy] || fallback;

const cleanUserSelect = 'name email phone role accountStatus address isAdmin adminPermissions lastLoginAt createdAt updatedAt';

const sumOrders = async (match, field) => {
  const [row] = await Order.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } }
  ]);
  return row?.total || 0;
};

const countOrdersWithItem = (match) => Order.countDocuments({ items: { $elemMatch: match } });

const sumItems = async (match, field) => {
  const [row] = await Order.aggregate([
    { $unwind: '$items' },
    { $match: match },
    { $group: { _id: null, total: { $sum: `$items.${field}` } } }
  ]);
  return row?.total || 0;
};

const aggregateUnitsSold = async (match) => {
  const [row] = await Order.aggregate([
    { $unwind: '$items' },
    { $match: { ...match, 'items.itemStatus': { $nin: ['cancelled', 'seller_rejected'] } } },
    { $group: { _id: null, total: { $sum: '$items.quantity' } } }
  ]);
  return row?.total || 0;
};

const pageResult = async (model, filter, query, options = {}) => {
  const { page, limit, skip } = pagination(query);
  const [items, total] = await Promise.all([
    model
      .find(filter)
      .sort(options.sort || sortFor(query.sortBy))
      .skip(skip)
      .limit(limit)
      .populate(options.populate || [])
      .select(options.select || undefined)
      .lean(),
    model.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

const logAction = async ({ adminId, actionType, targetType, targetId, reason = '', metadata = {} }) => {
  return AdminActionLog.create({
    adminId,
    actionType,
    targetType,
    targetId,
    reason,
    metadata
  });
};

const getActionHistory = (targetType, targetId, limit = 20) => {
  return AdminActionLog.find({ targetType, targetId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('adminId', cleanUserSelect)
    .lean();
};

const listActionLogs = async (query = {}) => {
  const filter = { ...dateRange(query) };
  if (query.targetType) filter.targetType = query.targetType;
  if (query.actionType) filter.actionType = query.actionType;
  if (query.adminId) filter.adminId = query.adminId;
  if (query.targetId) filter.targetId = query.targetId;
  if (query.q) {
    const q = regex(query.q);
    filter.$or = [{ actionType: q }, { targetType: q }, { reason: q }];
    if (mongoose.Types.ObjectId.isValid(query.q)) {
      const id = objectId(query.q);
      filter.$or.push({ _id: id }, { adminId: id }, { targetId: id });
    }
  }

  return pageResult(AdminActionLog, filter, query, {
    populate: [{ path: 'adminId', select: cleanUserSelect }],
    select: 'adminId actionType targetType targetId reason metadata createdAt',
    sort: { createdAt: -1 }
  });
};

const getActionLogDetail = async (actionLogId) => {
  const log = await AdminActionLog.findById(actionLogId)
    .populate('adminId', cleanUserSelect)
    .lean();
  if (!log) throw new AppError('Admin action log not found', 404);
  return log;
};

const requireDoc = async (model, id, label, query = {}) => {
  const doc = await model.findOne({ _id: id, ...query });
  if (!doc) {
    throw new AppError(`${label} not found`, 404);
  }
  return doc;
};

const listUsers = async (query) => {
  const filter = { ...dateRange(query) };
  if (query.role) filter.role = query.role;
  if (query.accountStatus) filter.accountStatus = query.accountStatus;
  if (query.q) {
    const q = regex(query.q);
    filter.$or = [{ name: q }, { email: q }, { phone: q }, { address: q }];
  }

  if (query.city || query.state) {
    const sellerFilter = {};
    if (query.city) sellerFilter.city = regex(query.city);
    if (query.state) sellerFilter.state = regex(query.state);
    const sellerUserIds = await SellerProfile.distinct('userId', sellerFilter);
    const addressTerms = [query.city, query.state].filter(Boolean).map((value) => ({ address: regex(value) }));
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ _id: { $in: sellerUserIds } }, ...addressTerms] }
    ];
  }

  return pageResult(User, filter, query, {
    select: cleanUserSelect,
    sort: sortFor(query.sortBy, { createdAt: -1 })
  });
};

const getUserDetail = async (userId) => {
  const user = await User.findById(userId).select(cleanUserSelect).lean();
  if (!user) throw new AppError('User not found', 404);

  const [
    buyerProfile,
    sellerProfile,
    totalOrders,
    totalSpent,
    totalReportsSubmitted,
    totalReportsAgainstUser,
    blockedUsers,
    comments,
    orders,
    reports,
    blocks,
    actionHistory
  ] = await Promise.all([
    BuyerProfile.findOne({ userId }).populate('savedProducts').populate('savedStores').lean(),
    SellerProfile.findOne({ userId }).populate('storeId').lean(),
    Order.countDocuments({ buyerId: userId }),
    sumOrders({ buyerId: objectId(userId), paymentStatus: { $in: ['paid', 'refunded', 'partially_refunded'] } }, 'finalTotal'),
    Report.countDocuments({ reporterId: userId }),
    Report.countDocuments({ $or: [{ targetType: 'user', targetId: objectId(userId) }, { targetOwnerId: userId }] }),
    BlockedUser.find({ blockerId: userId }).populate('blockedUserId', cleanUserSelect).sort({ createdAt: -1 }).limit(25).lean(),
    Comment.find({ userId }).sort({ createdAt: -1 }).limit(25).populate('reelId').lean(),
    Order.find({ buyerId: userId }).sort({ createdAt: -1 }).limit(25).lean(),
    Report.find({ $or: [{ reporterId: userId }, { targetOwnerId: userId }, { targetType: 'user', targetId: objectId(userId) }] }).sort({ createdAt: -1 }).limit(25).lean(),
    BlockedUser.find({ $or: [{ blockerId: userId }, { blockedUserId: userId }] }).sort({ createdAt: -1 }).limit(25).lean(),
    getActionHistory('user', userId)
  ]);

  return {
    user,
    buyerProfile,
    sellerProfile,
    metrics: {
      totalOrders,
      totalSpent,
      totalReportsSubmitted,
      totalReportsAgainstUser,
      savedProducts: buyerProfile?.savedProducts?.length || 0,
      savedStores: buyerProfile?.savedStores?.length || 0,
      blockedUsers: blockedUsers.length,
      comments: comments.length
    },
    related: {
      orders,
      reports,
      blocks,
      comments,
      savedProducts: buyerProfile?.savedProducts || [],
      savedStores: buyerProfile?.savedStores || [],
      blockedUsers
    },
    activityEvents: [
      ...orders.slice(0, 8).map((order) => ({ type: 'order', title: order.orderNumber, createdAt: order.createdAt })),
      ...comments.slice(0, 8).map((comment) => ({ type: 'comment', title: comment.text, createdAt: comment.createdAt })),
      ...reports.slice(0, 8).map((report) => ({ type: 'report', title: report.reason, createdAt: report.createdAt }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    actionHistory
  };
};

const updateUserStatus = async (adminId, userId, { accountStatus, reason = '' }) => {
  if (!['active', 'suspended', 'banned'].includes(accountStatus)) {
    throw new AppError('Invalid account status', 400);
  }
  const user = await requireDoc(User, userId, 'User');
  const previousStatus = user.accountStatus;
  user.accountStatus = accountStatus;
  await user.save();
  await logAction({
    adminId,
    actionType: `user_${accountStatus}`,
    targetType: 'user',
    targetId: userId,
    reason,
    metadata: { previousStatus, accountStatus }
  });
  return User.findById(userId).select(cleanUserSelect).lean();
};

const updateUserRole = async (adminId, userId, { role, reason = '' }) => {
  if (!['buyer', 'seller', 'admin'].includes(role)) {
    throw new AppError('Invalid user role', 400);
  }
  const user = await requireDoc(User, userId, 'User');
  const previousRole = user.role;
  user.role = role;
  user.isAdmin = role === 'admin';
  await user.save();
  await logAction({
    adminId,
    actionType: 'user_role_change',
    targetType: 'user',
    targetId: userId,
    reason,
    metadata: { previousRole, role }
  });
  return User.findById(userId).select(cleanUserSelect).lean();
};

const getUserActivity = (userId) => getUserDetail(userId).then((detail) => detail.activityEvents);
const getUserOrders = (userId) => Order.find({ buyerId: userId }).sort({ createdAt: -1 }).limit(100).lean();
const getUserReports = (userId) => Report.find({ $or: [{ reporterId: userId }, { targetOwnerId: userId }, { targetType: 'user', targetId: objectId(userId) }] }).sort({ createdAt: -1 }).limit(100).lean();
const getUserBlocks = (userId) => BlockedUser.find({ $or: [{ blockerId: userId }, { blockedUserId: userId }] }).sort({ createdAt: -1 }).limit(100).lean();
const getUserComments = (userId) => Comment.find({ userId }).sort({ createdAt: -1 }).limit(100).populate('reelId').lean();
const getUserSavedItems = async (userId) => {
  const profile = await BuyerProfile.findOne({ userId }).populate('savedProducts').populate('savedStores').lean();
  return {
    savedProducts: profile?.savedProducts || [],
    savedStores: profile?.savedStores || []
  };
};

const listSellers = async (query) => {
  const filter = {};
  if (query.status) filter.adminStatus = query.status;
  if (query.city) filter.city = regex(query.city);
  if (query.state) filter.state = regex(query.state);
  if (query.q) {
    const q = regex(query.q);
    const userIds = await User.distinct('_id', { $or: [{ name: q }, { email: q }, { phone: q }] });
    filter.$or = [{ storeName: q }, { storeCategory: q }, { city: q }, { state: q }, { userId: { $in: userIds } }];
  }

  return pageResult(SellerProfile, filter, query, {
    populate: [
      { path: 'userId', select: cleanUserSelect },
      { path: 'storeId' }
    ],
    sort: { storeName: 1 }
  });
};

const sellerStats = async (sellerId) => {
  const id = objectId(sellerId);
  const [
    productsCount,
    reelsCount,
    totalOrders,
    totalSales,
    sellerEarnings,
    platformCommissionFromSeller,
    pendingPayout,
    refundAmount,
    returnedOrders,
    cancelledOrders,
    unavailableOrders,
    reportsAgainstSeller,
    recentOrders,
    recentProducts,
    recentReels
  ] = await Promise.all([
    Product.countDocuments({ sellerId }),
    Reel.countDocuments({ sellerId }),
    Order.countDocuments({ sellerIds: sellerId }),
    sumItems({ 'items.sellerId': id }, 'itemTotal'),
    sumItems({ 'items.sellerId': id }, 'sellerEarningsAmount'),
    sumItems({ 'items.sellerId': id }, 'platformCommissionAmount'),
    SellerPayout.aggregate([{ $match: { sellerId: id, status: { $in: ['pending', 'processing', 'held'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    sumItems({ 'items.sellerId': id }, 'refundAmount'),
    countOrdersWithItem({ sellerId: id, itemStatus: { $in: ['returned', 'return_requested', 'return_approved'] } }),
    countOrdersWithItem({ sellerId: id, itemStatus: 'cancelled' }),
    countOrdersWithItem({ sellerId: id, itemStatus: 'seller_rejected' }),
    Report.countDocuments({ targetOwnerId: sellerId }),
    Order.find({ sellerIds: sellerId }).sort({ createdAt: -1 }).limit(10).lean(),
    Product.find({ sellerId }).sort({ createdAt: -1 }).limit(10).lean(),
    Reel.find({ sellerId }).sort({ createdAt: -1 }).limit(10).lean()
  ]);

  return {
    productsCount,
    reelsCount,
    totalOrders,
    totalSales,
    sellerEarnings,
    platformCommissionFromSeller,
    pendingPayout: pendingPayout[0]?.total || 0,
    refundAmount,
    returnRate: totalOrders ? returnedOrders / totalOrders : 0,
    cancellationRate: totalOrders ? cancelledOrders / totalOrders : 0,
    stockUnavailableRate: totalOrders ? unavailableOrders / totalOrders : 0,
    averageOrderAcceptanceTimeMinutes: 0,
    reportsAgainstSeller,
    recentOrders,
    recentProducts,
    recentReels
  };
};

const getSellerDetail = async (sellerId) => {
  const sellerProfile = await SellerProfile.findById(sellerId).populate('userId', cleanUserSelect).populate('storeId').lean();
  if (!sellerProfile) throw new AppError('Seller not found', 404);
  const [stats, earnings, payouts, reports, actionHistory] = await Promise.all([
    sellerStats(sellerProfile.userId._id || sellerProfile.userId),
    SellerEarning.find({ sellerId: sellerProfile.userId._id || sellerProfile.userId }).sort({ createdAt: -1 }).limit(25).lean(),
    SellerPayout.find({ sellerId: sellerProfile.userId._id || sellerProfile.userId }).sort({ createdAt: -1 }).limit(25).lean(),
    Report.find({ targetOwnerId: sellerProfile.userId._id || sellerProfile.userId }).sort({ createdAt: -1 }).limit(25).lean(),
    getActionHistory('seller', sellerId)
  ]);
  return { sellerProfile, stats, earnings, payouts, reports, actionHistory };
};

const updateSellerStatus = async (adminId, sellerId, { status, reason = '' }) => {
  if (!['active', 'suspended'].includes(status)) throw new AppError('Invalid seller status', 400);
  const seller = await requireDoc(SellerProfile, sellerId, 'Seller');
  const previousStatus = seller.adminStatus;
  seller.adminStatus = status;
  await seller.save();
  await logAction({ adminId, actionType: status === 'suspended' ? 'seller_suspended' : 'seller_reactivated', targetType: 'seller', targetId: sellerId, reason, metadata: { previousStatus, status } });
  return SellerProfile.findById(sellerId).populate('userId', cleanUserSelect).populate('storeId').lean();
};

const verifySeller = async (adminId, sellerId, { verified = true, reason = '' }) => {
  const seller = await requireDoc(SellerProfile, sellerId, 'Seller');
  const previousStatus = seller.kycStatus;
  seller.kycStatus = verified ? 'verified' : 'pending';
  await seller.save();
  if (seller.storeId) {
    await Store.findByIdAndUpdate(seller.storeId, { verified });
  }
  await logAction({ adminId, actionType: verified ? 'seller_verified' : 'seller_unverified', targetType: 'seller', targetId: sellerId, reason, metadata: { previousStatus, kycStatus: seller.kycStatus, verified } });
  return SellerProfile.findById(sellerId).populate('userId', cleanUserSelect).populate('storeId').lean();
};

const updateSellerCommission = async (adminId, sellerId, { commissionPercentage, reason = '' }) => {
  const seller = await requireDoc(SellerProfile, sellerId, 'Seller');
  const previousCommissionPercentage = seller.commissionPercentageOverride;
  seller.commissionPercentageOverride = commissionPercentage;
  await seller.save();
  await logAction({ adminId, actionType: 'seller_commission_change', targetType: 'seller', targetId: sellerId, reason, metadata: { previousCommissionPercentage, commissionPercentage } });
  return SellerProfile.findById(sellerId).populate('userId', cleanUserSelect).populate('storeId').lean();
};

const listStores = async (query) => {
  const filter = { ...dateRange(query) };
  if (query.status) filter.status = query.status;
  if (query.city) filter.city = regex(query.city);
  if (query.state) filter.state = regex(query.state);
  if (query.q) {
    const q = regex(query.q);
    filter.$or = [{ storeName: q }, { category: q }, { city: q }, { state: q }, { region: q }, { description: q }];
  }
  return pageResult(Store, filter, query, { populate: [{ path: 'sellerId', select: cleanUserSelect }], sort: sortFor(query.sortBy, { createdAt: -1 }) });
};

const storeStats = async (storeId) => {
  const id = objectId(storeId);
  const [productCount, reelCount, reports, totalSales, commissionEarned, recentProducts, recentReels, actionHistory] = await Promise.all([
    Product.countDocuments({ storeId }),
    Reel.countDocuments({ storeId }),
    Report.find({ targetType: 'store', targetId: id }).sort({ createdAt: -1 }).limit(25).lean(),
    sumItems({ 'items.storeId': id }, 'itemTotal'),
    sumItems({ 'items.storeId': id }, 'platformCommissionAmount'),
    Product.find({ storeId }).sort({ createdAt: -1 }).limit(10).lean(),
    Reel.find({ storeId }).sort({ createdAt: -1 }).limit(10).lean(),
    getActionHistory('store', storeId)
  ]);
  return { productCount, reelCount, reports, totalSales, commissionEarned, recentProducts, recentReels, actionHistory };
};

const getStoreDetail = async (storeId) => {
  const store = await Store.findById(storeId).populate('sellerId', cleanUserSelect).lean();
  if (!store) throw new AppError('Store not found', 404);
  const stats = await storeStats(storeId);
  return { store, stats };
};

const updateStoreStatus = async (adminId, storeId, { status, reason = '' }) => {
  if (!['active', 'hidden', 'suspended'].includes(status)) throw new AppError('Invalid store status', 400);
  const store = await requireDoc(Store, storeId, 'Store');
  const previousStatus = store.status;
  store.status = status;
  await store.save();
  await logAction({ adminId, actionType: `store_${status}`, targetType: 'store', targetId: storeId, reason, metadata: { previousStatus, status } });
  return Store.findById(storeId).populate('sellerId', cleanUserSelect).lean();
};

const verifyStore = async (adminId, storeId, { verified = true, reason = '' }) => {
  const store = await requireDoc(Store, storeId, 'Store');
  const previousVerified = store.verified;
  store.verified = Boolean(verified);
  await store.save();
  await logAction({ adminId, actionType: store.verified ? 'store_verified' : 'store_unverified', targetType: 'store', targetId: storeId, reason, metadata: { previousVerified, verified: store.verified } });
  return Store.findById(storeId).populate('sellerId', cleanUserSelect).lean();
};

const featureStore = async (adminId, storeId, { featured = true, reason = '' }) => {
  const store = await requireDoc(Store, storeId, 'Store');
  const previousFeatured = store.featured;
  store.featured = Boolean(featured);
  await store.save();
  await logAction({ adminId, actionType: store.featured ? 'store_featured' : 'store_unfeatured', targetType: 'store', targetId: storeId, reason, metadata: { previousFeatured, featured: store.featured } });
  return Store.findById(storeId).populate('sellerId', cleanUserSelect).lean();
};

const listProducts = async (query) => {
  const filter = { ...dateRange(query) };
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = regex(query.category);
  if (query.region) filter.region = regex(query.region);
  if (query.q) {
    const q = regex(query.q);
    filter.$or = [{ title: q }, { description: q }, { category: q }, { region: q }, { sku: q }, { barcode: q }, { tags: q }];
  }
  return pageResult(Product, filter, query, {
    populate: [
      { path: 'sellerId', select: cleanUserSelect },
      { path: 'storeId' }
    ],
    sort: sortFor(query.sortBy, { createdAt: -1 })
  });
};

const productStats = async (productId) => {
  const id = objectId(productId);
  const [orders, unitsSold, grossSales, commissionEarned, sellerEarnings, refunds, returns, reports, relatedReels, actionHistory] = await Promise.all([
    Order.find({ 'items.productId': productId }).sort({ createdAt: -1 }).limit(25).lean(),
    aggregateUnitsSold({ 'items.productId': id }),
    sumItems({ 'items.productId': id }, 'itemTotal'),
    sumItems({ 'items.productId': id }, 'platformCommissionAmount'),
    sumItems({ 'items.productId': id }, 'sellerEarningsAmount'),
    sumItems({ 'items.productId': id }, 'refundAmount'),
    ReturnRequest.find({ productId }).sort({ createdAt: -1 }).limit(25).lean(),
    Report.find({ targetType: 'product', targetId: id }).sort({ createdAt: -1 }).limit(25).lean(),
    Reel.find({ taggedProductIds: productId }).sort({ createdAt: -1 }).limit(25).lean(),
    getActionHistory('product', productId)
  ]);
  return { orders, unitsSold, grossSales, commissionEarned, sellerEarnings, refunds, returns, reports, relatedReels, actionHistory };
};

const getProductDetail = async (productId) => {
  const product = await Product.findById(productId).populate('sellerId', cleanUserSelect).populate('storeId').lean();
  if (!product) throw new AppError('Product not found', 404);
  const availableStock = Math.max((product.stock || 0) - (product.reservedStock || 0), 0);
  const stats = await productStats(productId);
  return { product: { ...product, availableStock, stockStatus: availableStock <= 0 ? 'out_of_stock' : availableStock <= (product.lowStockThreshold || 3) ? 'low_stock' : 'in_stock' }, stats };
};

const updateProductStatus = async (adminId, productId, { status, reason = '' }) => {
  if (!['active', 'hidden', 'sold_out', 'inactive', 'kyc_pending'].includes(status)) throw new AppError('Invalid product status', 400);
  const product = await requireDoc(Product, productId, 'Product');
  const previousStatus = product.status;
  product.status = status;
  await product.save();
  await logAction({ adminId, actionType: `product_${status}`, targetType: 'product', targetId: productId, reason, metadata: { previousStatus, status } });
  return Product.findById(productId).populate('sellerId', cleanUserSelect).populate('storeId').lean();
};

const featureProduct = async (adminId, productId, { featured = true, reason = '' }) => {
  const product = await requireDoc(Product, productId, 'Product');
  const previousFeatured = product.featured;
  product.featured = Boolean(featured);
  await product.save();
  await logAction({ adminId, actionType: product.featured ? 'product_featured' : 'product_unfeatured', targetType: 'product', targetId: productId, reason, metadata: { previousFeatured, featured: product.featured } });
  return Product.findById(productId).populate('sellerId', cleanUserSelect).populate('storeId').lean();
};

const updateProductStock = async (adminId, productId, { stock, reservedStock, lowStockThreshold, reason = '' }) => {
  const product = await requireDoc(Product, productId, 'Product');
  const previousStock = product.stock;
  if (stock !== undefined) product.stock = stock;
  if (reservedStock !== undefined) product.reservedStock = reservedStock;
  if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;
  product.inventoryHistory.push({
    adjustedBy: adminId,
    previousStock,
    newStock: product.stock,
    reason
  });
  await product.save();
  await logAction({ adminId, actionType: 'product_stock_adjustment', targetType: 'product', targetId: productId, reason, metadata: { previousStock, stock: product.stock, reservedStock: product.reservedStock, lowStockThreshold: product.lowStockThreshold } });
  return Product.findById(productId).populate('sellerId', cleanUserSelect).populate('storeId').lean();
};

const getProductHistory = async (productId) => {
  const product = await Product.findById(productId).select('inventoryHistory').populate('inventoryHistory.adjustedBy', cleanUserSelect).lean();
  if (!product) throw new AppError('Product not found', 404);
  return product.inventoryHistory || [];
};

const listReels = async (query) => {
  const filter = { ...dateRange(query) };
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = regex(query.category);
  if (query.region) filter.region = regex(query.region);
  if (query.q) {
    const q = regex(query.q);
    filter.$or = [{ caption: q }, { category: q }, { region: q }, { hashtags: q }];
  }
  return pageResult(Reel, filter, query, {
    populate: [
      { path: 'sellerId', select: cleanUserSelect },
      { path: 'storeId' },
      { path: 'taggedProductIds' }
    ],
    sort: sortFor(query.sortBy, { createdAt: -1 })
  });
};

const reelStats = async (reelId) => {
  const id = objectId(reelId);
  const [comments, reports, actionHistory] = await Promise.all([
    Comment.find({ reelId }).sort({ createdAt: -1 }).limit(50).populate('userId', cleanUserSelect).lean(),
    Report.find({ targetType: 'reel', targetId: id }).sort({ createdAt: -1 }).limit(25).lean(),
    getActionHistory('reel', reelId)
  ]);
  return { comments, reports, analytics: { productClicks: 0, cartAdds: 0, salesAttributed: 0, shares: 0 }, actionHistory };
};

const getReelDetail = async (reelId) => {
  const reel = await Reel.findById(reelId).populate('sellerId', cleanUserSelect).populate('storeId').populate('taggedProductIds').lean();
  if (!reel) throw new AppError('Reel not found', 404);
  const stats = await reelStats(reelId);
  return { reel, stats };
};

const updateReelStatus = async (adminId, reelId, { status, reason = '' }) => {
  if (!['active', 'hidden', 'sold_out', 'removed'].includes(status)) throw new AppError('Invalid reel status', 400);
  const reel = await requireDoc(Reel, reelId, 'Reel');
  const previousStatus = reel.status;
  reel.status = status;
  await reel.save();
  await logAction({ adminId, actionType: `reel_${status}`, targetType: 'reel', targetId: reelId, reason, metadata: { previousStatus, status } });
  return Reel.findById(reelId).populate('sellerId', cleanUserSelect).populate('storeId').populate('taggedProductIds').lean();
};

const featureReel = async (adminId, reelId, { featured = true, reason = '' }) => {
  const reel = await requireDoc(Reel, reelId, 'Reel');
  const previousFeatured = reel.featured;
  reel.featured = Boolean(featured);
  await reel.save();
  await logAction({ adminId, actionType: reel.featured ? 'reel_featured' : 'reel_unfeatured', targetType: 'reel', targetId: reelId, reason, metadata: { previousFeatured, featured: reel.featured } });
  return Reel.findById(reelId).populate('sellerId', cleanUserSelect).populate('storeId').populate('taggedProductIds').lean();
};

const listComments = async (query) => {
  const filter = { ...dateRange(query) };
  if (query.status) filter.status = query.status;
  if (query.q) filter.text = regex(query.q);
  return pageResult(Comment, filter, query, {
    populate: [
      { path: 'userId', select: cleanUserSelect },
      { path: 'sellerId', select: cleanUserSelect },
      { path: 'reelId' }
    ],
    sort: sortFor(query.sortBy, { createdAt: -1 })
  });
};

const getCommentDetail = async (commentId) => {
  const comment = await Comment.findById(commentId).populate('userId', cleanUserSelect).populate('sellerId', cleanUserSelect).populate('reelId').lean();
  if (!comment) throw new AppError('Comment not found', 404);
  const [reports, actionHistory] = await Promise.all([
    Report.find({ targetType: 'comment', targetId: objectId(commentId) }).sort({ createdAt: -1 }).limit(25).lean(),
    getActionHistory('comment', commentId)
  ]);
  return { comment, reports, actionHistory };
};

const updateCommentStatus = async (adminId, commentId, { status, reason = '' }) => {
  if (!['active', 'hidden', 'deleted'].includes(status)) throw new AppError('Invalid comment status', 400);
  const comment = await requireDoc(Comment, commentId, 'Comment');
  const previousStatus = comment.status;
  comment.status = status;
  comment.deletedAt = status === 'deleted' ? new Date() : null;
  await comment.save();
  await logAction({ adminId, actionType: `comment_${status}`, targetType: 'comment', targetId: commentId, reason, metadata: { previousStatus, status } });
  return Comment.findById(commentId).populate('userId', cleanUserSelect).populate('sellerId', cleanUserSelect).populate('reelId').lean();
};

const deleteComment = (adminId, commentId, body = {}) => updateCommentStatus(adminId, commentId, { status: 'deleted', reason: body.reason || 'Deleted by admin' });

module.exports = {
  logAction,
  listActionLogs,
  getActionLogDetail,
  listUsers,
  getUserDetail,
  updateUserStatus,
  updateUserRole,
  getUserActivity,
  getUserOrders,
  getUserReports,
  getUserBlocks,
  getUserComments,
  getUserSavedItems,
  listSellers,
  getSellerDetail,
  updateSellerStatus,
  verifySeller,
  updateSellerCommission,
  listStores,
  getStoreDetail,
  updateStoreStatus,
  verifyStore,
  featureStore,
  listProducts,
  getProductDetail,
  updateProductStatus,
  featureProduct,
  updateProductStock,
  getProductHistory,
  productStats,
  listReels,
  getReelDetail,
  updateReelStatus,
  featureReel,
  reelStats,
  listComments,
  getCommentDetail,
  updateCommentStatus,
  deleteComment
};
