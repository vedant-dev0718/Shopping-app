const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const service = require('./adminTools.service');

const send = (res, message, data, meta = null, statusCode = 200) => successResponse(res, {
  statusCode,
  message,
  data,
  meta
});

const listResult = (res, message, result) => send(res, message, result.items, result.pagination);

module.exports = {
  listReports: asyncHandler(async (req, res) => listResult(res, 'Moderation reports fetched', await service.listReports(req.query))),
  getReport: asyncHandler(async (req, res) => send(res, 'Moderation report detail fetched', await service.getReportDetail(req.params.reportId))),
  resolveReport: asyncHandler(async (req, res) => send(res, 'Moderation report resolved', await service.resolveReport(req.user.id, req.params.reportId, req.body))),
  listModerationActions: asyncHandler(async (req, res) => listResult(res, 'Moderation actions fetched', await service.listModerationActions(req.query))),
  listBlockedUsers: asyncHandler(async (req, res) => listResult(res, 'Blocked users fetched', await service.listBlockedUsers(req.query))),

  listSupportRequests: asyncHandler(async (req, res) => listResult(res, 'Support requests fetched', await service.listSupportRequests(req.query))),
  getSupportRequest: asyncHandler(async (req, res) => send(res, 'Support request detail fetched', await service.getSupportDetail(req.params.requestId))),
  updateSupportStatus: asyncHandler(async (req, res) => send(res, 'Support request status updated', await service.updateSupportStatus(req.user.id, req.params.requestId, req.body))),
  replySupportRequest: asyncHandler(async (req, res) => send(res, 'Support reply saved', await service.replySupportRequest(req.user.id, req.params.requestId, req.body), null, 201)),
  assignSupportRequest: asyncHandler(async (req, res) => send(res, 'Support request assigned', await service.assignSupportRequest(req.user.id, req.params.requestId, req.body))),

  listContentPages: asyncHandler(async (_req, res) => send(res, 'Content pages fetched', await service.listContentPages())),
  getContentPage: asyncHandler(async (req, res) => send(res, 'Content page fetched', await service.getContentPage(req.params.slug))),
  updateContentPage: asyncHandler(async (req, res) => send(res, 'Content page updated', await service.updateContentPage(req.user.id, req.params.slug, req.body))),

  listSettings: asyncHandler(async (_req, res) => send(res, 'App settings fetched', await service.listSettings())),
  updateSetting: asyncHandler(async (req, res) => send(res, 'App setting updated', await service.updateSetting(req.user.id, req.params.key, req.body))),

  listCategories: asyncHandler(async (_req, res) => send(res, 'Categories fetched', await service.listCategories())),
  createCategory: asyncHandler(async (req, res) => send(res, 'Category created', await service.createCategory(req.user.id, req.body), null, 201)),
  updateCategory: asyncHandler(async (req, res) => send(res, 'Category updated', await service.updateCategory(req.user.id, req.params.id, req.body))),
  deleteCategory: asyncHandler(async (req, res) => send(res, 'Category deleted', await service.deleteCategory(req.user.id, req.params.id, req.body.reason))),

  listRegions: asyncHandler(async (_req, res) => send(res, 'Regions fetched', await service.listRegions())),
  createRegion: asyncHandler(async (req, res) => send(res, 'Region created', await service.createRegion(req.user.id, req.body), null, 201)),
  updateRegion: asyncHandler(async (req, res) => send(res, 'Region updated', await service.updateRegion(req.user.id, req.params.id, req.body))),
  deleteRegion: asyncHandler(async (req, res) => send(res, 'Region deleted', await service.deleteRegion(req.user.id, req.params.id, req.body.reason))),

  listFeatured: asyncHandler(async (_req, res) => send(res, 'Featured content fetched', await service.listFeatured())),
  featureStore: asyncHandler(async (req, res) => send(res, 'Store featured', await service.setFeatured(req.user.id, 'stores', req.params.storeId, true, req.body.reason), null, 201)),
  unfeatureStore: asyncHandler(async (req, res) => send(res, 'Store unfeatured', await service.setFeatured(req.user.id, 'stores', req.params.storeId, false, req.body.reason))),
  featureProduct: asyncHandler(async (req, res) => send(res, 'Product featured', await service.setFeatured(req.user.id, 'products', req.params.productId, true, req.body.reason), null, 201)),
  unfeatureProduct: asyncHandler(async (req, res) => send(res, 'Product unfeatured', await service.setFeatured(req.user.id, 'products', req.params.productId, false, req.body.reason))),
  featureReel: asyncHandler(async (req, res) => send(res, 'Reel featured', await service.setFeatured(req.user.id, 'reels', req.params.reelId, true, req.body.reason), null, 201)),
  unfeatureReel: asyncHandler(async (req, res) => send(res, 'Reel unfeatured', await service.setFeatured(req.user.id, 'reels', req.params.reelId, false, req.body.reason)))
};
