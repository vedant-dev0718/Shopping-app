const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const service = require('./adminManagement.service');

const send = (res, message, data, meta = null) => successResponse(res, { message, data, meta });

const listActionLogs = asyncHandler(async (req, res) => {
  const result = await service.listActionLogs(req.query);
  return send(res, 'Admin action logs fetched', result.items, result.pagination);
});

const getActionLog = asyncHandler(async (req, res) => {
  return send(res, 'Admin action log fetched', await service.getActionLogDetail(req.params.actionLogId));
});

const listUsers = asyncHandler(async (req, res) => {
  const result = await service.listUsers(req.query);
  return send(res, 'Users fetched', result.items, result.pagination);
});

const getUser = asyncHandler(async (req, res) => {
  return send(res, 'User detail fetched', await service.getUserDetail(req.params.userId));
});

const updateUserStatus = asyncHandler(async (req, res) => {
  return send(res, 'User status updated', await service.updateUserStatus(req.user.id, req.params.userId, req.body));
});

const updateUserRole = asyncHandler(async (req, res) => {
  return send(res, 'User role updated', await service.updateUserRole(req.user.id, req.params.userId, req.body));
});

const getUserActivity = asyncHandler(async (req, res) => {
  return send(res, 'User activity fetched', await service.getUserActivity(req.params.userId));
});

const getUserOrders = asyncHandler(async (req, res) => {
  return send(res, 'User orders fetched', await service.getUserOrders(req.params.userId));
});

const getUserReports = asyncHandler(async (req, res) => {
  return send(res, 'User reports fetched', await service.getUserReports(req.params.userId));
});

const getUserBlocks = asyncHandler(async (req, res) => {
  return send(res, 'User blocks fetched', await service.getUserBlocks(req.params.userId));
});

const getUserComments = asyncHandler(async (req, res) => {
  return send(res, 'User comments fetched', await service.getUserComments(req.params.userId));
});

const getUserSavedItems = asyncHandler(async (req, res) => {
  return send(res, 'User saved items fetched', await service.getUserSavedItems(req.params.userId));
});

const listSellers = asyncHandler(async (req, res) => {
  const result = await service.listSellers(req.query);
  return send(res, 'Sellers fetched', result.items, result.pagination);
});

const getSeller = asyncHandler(async (req, res) => {
  return send(res, 'Seller detail fetched', await service.getSellerDetail(req.params.sellerId));
});

const updateSellerStatus = asyncHandler(async (req, res) => {
  return send(res, 'Seller status updated', await service.updateSellerStatus(req.user.id, req.params.sellerId, req.body));
});

const verifySeller = asyncHandler(async (req, res) => {
  return send(res, 'Seller verification updated', await service.verifySeller(req.user.id, req.params.sellerId, req.body));
});

const updateSellerCommission = asyncHandler(async (req, res) => {
  return send(res, 'Seller commission updated', await service.updateSellerCommission(req.user.id, req.params.sellerId, req.body));
});

const listStores = asyncHandler(async (req, res) => {
  const result = await service.listStores(req.query);
  return send(res, 'Stores fetched', result.items, result.pagination);
});

const getStore = asyncHandler(async (req, res) => {
  return send(res, 'Store detail fetched', await service.getStoreDetail(req.params.storeId));
});

const updateStoreStatus = asyncHandler(async (req, res) => {
  return send(res, 'Store status updated', await service.updateStoreStatus(req.user.id, req.params.storeId, req.body));
});

const verifyStore = asyncHandler(async (req, res) => {
  return send(res, 'Store verification updated', await service.verifyStore(req.user.id, req.params.storeId, req.body));
});

const featureStore = asyncHandler(async (req, res) => {
  return send(res, 'Store feature status updated', await service.featureStore(req.user.id, req.params.storeId, req.body));
});

const listProducts = asyncHandler(async (req, res) => {
  const result = await service.listProducts(req.query);
  return send(res, 'Products fetched', result.items, result.pagination);
});

const getProduct = asyncHandler(async (req, res) => {
  return send(res, 'Product detail fetched', await service.getProductDetail(req.params.productId));
});

const updateProductStatus = asyncHandler(async (req, res) => {
  return send(res, 'Product status updated', await service.updateProductStatus(req.user.id, req.params.productId, req.body));
});

const featureProduct = asyncHandler(async (req, res) => {
  return send(res, 'Product feature status updated', await service.featureProduct(req.user.id, req.params.productId, req.body));
});

const updateProductStock = asyncHandler(async (req, res) => {
  return send(res, 'Product stock updated', await service.updateProductStock(req.user.id, req.params.productId, req.body));
});

const getProductHistory = asyncHandler(async (req, res) => {
  return send(res, 'Product history fetched', await service.getProductHistory(req.params.productId));
});

const getProductOrders = asyncHandler(async (req, res) => {
  const detail = await service.productStats(req.params.productId);
  return send(res, 'Product orders fetched', detail.orders);
});

const getProductAnalytics = asyncHandler(async (req, res) => {
  const detail = await service.productStats(req.params.productId);
  return send(res, 'Product analytics fetched', detail);
});

const listReels = asyncHandler(async (req, res) => {
  const result = await service.listReels(req.query);
  return send(res, 'Reels fetched', result.items, result.pagination);
});

const getReel = asyncHandler(async (req, res) => {
  return send(res, 'Reel detail fetched', await service.getReelDetail(req.params.reelId));
});

const updateReelStatus = asyncHandler(async (req, res) => {
  return send(res, 'Reel status updated', await service.updateReelStatus(req.user.id, req.params.reelId, req.body));
});

const featureReel = asyncHandler(async (req, res) => {
  return send(res, 'Reel feature status updated', await service.featureReel(req.user.id, req.params.reelId, req.body));
});

const getReelComments = asyncHandler(async (req, res) => {
  const detail = await service.reelStats(req.params.reelId);
  return send(res, 'Reel comments fetched', detail.comments);
});

const getReelAnalytics = asyncHandler(async (req, res) => {
  const detail = await service.reelStats(req.params.reelId);
  return send(res, 'Reel analytics fetched', detail.analytics);
});

const getReelReports = asyncHandler(async (req, res) => {
  const detail = await service.reelStats(req.params.reelId);
  return send(res, 'Reel reports fetched', detail.reports);
});

const listComments = asyncHandler(async (req, res) => {
  const result = await service.listComments(req.query);
  return send(res, 'Comments fetched', result.items, result.pagination);
});

const getComment = asyncHandler(async (req, res) => {
  return send(res, 'Comment detail fetched', await service.getCommentDetail(req.params.commentId));
});

const updateCommentStatus = asyncHandler(async (req, res) => {
  return send(res, 'Comment status updated', await service.updateCommentStatus(req.user.id, req.params.commentId, req.body));
});

const deleteComment = asyncHandler(async (req, res) => {
  return send(res, 'Comment deleted', await service.deleteComment(req.user.id, req.params.commentId, req.body));
});

module.exports = {
  listActionLogs,
  getActionLog,
  listUsers,
  getUser,
  updateUserStatus,
  updateUserRole,
  getUserActivity,
  getUserOrders,
  getUserReports,
  getUserBlocks,
  getUserComments,
  getUserSavedItems,
  listSellers,
  getSeller,
  updateSellerStatus,
  verifySeller,
  updateSellerCommission,
  listStores,
  getStore,
  updateStoreStatus,
  verifyStore,
  featureStore,
  listProducts,
  getProduct,
  updateProductStatus,
  featureProduct,
  updateProductStock,
  getProductHistory,
  getProductOrders,
  getProductAnalytics,
  listReels,
  getReel,
  updateReelStatus,
  featureReel,
  getReelComments,
  getReelAnalytics,
  getReelReports,
  listComments,
  getComment,
  updateCommentStatus,
  deleteComment
};
