const router = require('express').Router();
const { body, param, query } = require('express-validator');

const controller = require('./adminTools.controller');
const validate = require('../../middleware/validate.middleware');

const mongoId = (name) => param(name).isMongoId().withMessage(`${name} must be a valid id`);
const paging = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('fromDate').optional().isISO8601().withMessage('fromDate must be a valid ISO date'),
  query('toDate').optional().isISO8601().withMessage('toDate must be a valid ISO date')
];
const reason = body('reason').optional({ checkFalsy: true }).trim().isLength({ max: 1000 });
const taxonomyBody = [
  body('name').optional().trim().isLength({ min: 1, max: 120 }),
  body('slug').optional({ checkFalsy: true }).trim().isLength({ max: 140 }),
  body('state').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body('isEnabled').optional().isBoolean(),
  body('sortOrder').optional().isInt({ min: 0 }),
  reason
];

router.get('/moderation/reports', [
  ...paging,
  query('status').optional().isIn(['pending', 'reviewing', 'resolved', 'dismissed']),
  query('targetType').optional().isIn(['reel', 'product', 'comment', 'store', 'user']),
  query('reason').optional().isIn(['spam', 'harassment', 'hate', 'nudity', 'violence', 'scam', 'counterfeit', 'self_harm', 'other']),
  query('reporterId').optional().isMongoId(),
  query('targetId').optional().isMongoId()
], validate, controller.listReports);
router.get('/moderation/reports/:reportId', [mongoId('reportId')], validate, controller.getReport);
router.patch('/moderation/reports/:reportId/resolve', [
  mongoId('reportId'),
  body('action').isIn(['dismissed', 'dismiss_report', 'hide_content', 'content_hidden', 'content_removed', 'user_warned', 'user_suspended', 'suspend_user', 'user_banned']),
  body('note').optional({ checkFalsy: true }).trim().isLength({ max: 1000 })
], validate, controller.resolveReport);
router.get('/moderation/actions', paging, validate, controller.listModerationActions);
router.get('/moderation/blocked-users', paging, validate, controller.listBlockedUsers);

router.get('/support/requests', [
  ...paging,
  query('status').optional().isIn(['open', 'in_progress', 'waiting_on_user', 'resolved', 'closed']),
  query('assignedAdminId').optional().isMongoId()
], validate, controller.listSupportRequests);
router.get('/support/requests/:requestId', [mongoId('requestId')], validate, controller.getSupportRequest);
router.patch('/support/requests/:requestId/status', [
  mongoId('requestId'),
  body('status').isIn(['open', 'in_progress', 'waiting_on_user', 'resolved', 'closed']),
  reason
], validate, controller.updateSupportStatus);
router.post('/support/requests/:requestId/reply', [
  mongoId('requestId'),
  body('message').trim().notEmpty().isLength({ max: 2000 })
], validate, controller.replySupportRequest);
router.patch('/support/requests/:requestId/assign', [
  mongoId('requestId'),
  body('assignedAdminId').optional().isMongoId(),
  reason
], validate, controller.assignSupportRequest);

router.get('/content/pages', controller.listContentPages);
router.get('/content/pages/:slug', [param('slug').trim().notEmpty()], validate, controller.getContentPage);
router.patch('/content/pages/:slug', [
  param('slug').trim().notEmpty(),
  body('title').optional().trim().isLength({ min: 1, max: 160 }),
  body('sections').optional().isArray(),
  body('sections.*.heading').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
  body('sections.*.body').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }),
  body('isPublished').optional().isBoolean(),
  reason
], validate, controller.updateContentPage);

router.get('/settings', controller.listSettings);
router.patch('/settings/:key', [
  param('key').trim().notEmpty(),
  body('value').exists().withMessage('value is required'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  reason
], validate, controller.updateSetting);

router.get('/categories', controller.listCategories);
router.post('/categories', [body('name').trim().notEmpty().isLength({ max: 120 }), ...taxonomyBody], validate, controller.createCategory);
router.patch('/categories/:id', [mongoId('id'), ...taxonomyBody], validate, controller.updateCategory);
router.delete('/categories/:id', [mongoId('id'), reason], validate, controller.deleteCategory);

router.get('/regions', controller.listRegions);
router.post('/regions', [body('name').trim().notEmpty().isLength({ max: 120 }), ...taxonomyBody], validate, controller.createRegion);
router.patch('/regions/:id', [mongoId('id'), ...taxonomyBody], validate, controller.updateRegion);
router.delete('/regions/:id', [mongoId('id'), reason], validate, controller.deleteRegion);

router.get('/featured', controller.listFeatured);
router.post('/featured/stores/:storeId', [mongoId('storeId'), reason], validate, controller.featureStore);
router.delete('/featured/stores/:storeId', [mongoId('storeId'), reason], validate, controller.unfeatureStore);
router.post('/featured/products/:productId', [mongoId('productId'), reason], validate, controller.featureProduct);
router.delete('/featured/products/:productId', [mongoId('productId'), reason], validate, controller.unfeatureProduct);
router.post('/featured/reels/:reelId', [mongoId('reelId'), reason], validate, controller.featureReel);
router.delete('/featured/reels/:reelId', [mongoId('reelId'), reason], validate, controller.unfeatureReel);

module.exports = router;
