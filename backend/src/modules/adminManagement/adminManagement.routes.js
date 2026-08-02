const router = require('express').Router();
const { body, param, query } = require('express-validator');

const controller = require('./adminManagement.controller');
const validate = require('../../middleware/validate.middleware');

const mongoId = (name) => param(name).isMongoId().withMessage(`${name} must be a valid id`);
const pagingValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('fromDate').optional().isISO8601().withMessage('fromDate must be a valid ISO date'),
  query('toDate').optional().isISO8601().withMessage('toDate must be a valid ISO date')
];

const reasonValidation = body('reason').optional({ checkFalsy: true }).trim().isLength({ max: 1000 });

router.get(
  '/action-logs',
  [
    ...pagingValidation,
    query('targetType').optional().trim().isLength({ max: 80 }),
    query('actionType').optional().trim().isLength({ max: 120 }),
    query('adminId').optional().isMongoId().withMessage('adminId must be a valid id'),
    query('targetId').optional().isMongoId().withMessage('targetId must be a valid id')
  ],
  validate,
  controller.listActionLogs
);
router.get('/action-logs/:actionLogId', [mongoId('actionLogId')], validate, controller.getActionLog);

router.get(
  '/users',
  [
    ...pagingValidation,
    query('role').optional().isIn(['buyer', 'seller', 'admin']),
    query('accountStatus').optional().isIn(['active', 'suspended', 'banned', 'deleted'])
  ],
  validate,
  controller.listUsers
);
router.get('/users/:userId', [mongoId('userId')], validate, controller.getUser);
router.patch(
  '/users/:userId/status',
  [mongoId('userId'), body('accountStatus').isIn(['active', 'suspended', 'banned']), reasonValidation],
  validate,
  controller.updateUserStatus
);
router.patch(
  '/users/:userId/role',
  [mongoId('userId'), body('role').isIn(['buyer', 'seller', 'admin']), reasonValidation],
  validate,
  controller.updateUserRole
);
router.get('/users/:userId/activity', [mongoId('userId')], validate, controller.getUserActivity);
router.get('/users/:userId/orders', [mongoId('userId')], validate, controller.getUserOrders);
router.get('/users/:userId/reports', [mongoId('userId')], validate, controller.getUserReports);
router.get('/users/:userId/blocks', [mongoId('userId')], validate, controller.getUserBlocks);
router.get('/users/:userId/comments', [mongoId('userId')], validate, controller.getUserComments);
router.get('/users/:userId/saved-items', [mongoId('userId')], validate, controller.getUserSavedItems);

router.get('/sellers', pagingValidation, validate, controller.listSellers);
router.get('/sellers/:sellerId', [mongoId('sellerId')], validate, controller.getSeller);
router.patch(
  '/sellers/:sellerId/status',
  [mongoId('sellerId'), body('status').isIn(['active', 'suspended']), reasonValidation],
  validate,
  controller.updateSellerStatus
);
router.patch(
  '/sellers/:sellerId/verify',
  [mongoId('sellerId'), body('verified').optional().isBoolean(), reasonValidation],
  validate,
  controller.verifySeller
);
router.patch(
  '/sellers/:sellerId/commission',
  [mongoId('sellerId'), body('commissionPercentage').isFloat({ min: 0, max: 100 }), reasonValidation],
  validate,
  controller.updateSellerCommission
);

router.get('/stores', pagingValidation, validate, controller.listStores);
router.get('/stores/:storeId', [mongoId('storeId')], validate, controller.getStore);
router.patch(
  '/stores/:storeId/status',
  [mongoId('storeId'), body('status').isIn(['active', 'hidden', 'suspended']), reasonValidation],
  validate,
  controller.updateStoreStatus
);
router.patch(
  '/stores/:storeId/verify',
  [mongoId('storeId'), body('verified').optional().isBoolean(), reasonValidation],
  validate,
  controller.verifyStore
);
router.patch(
  '/stores/:storeId/feature',
  [mongoId('storeId'), body('featured').optional().isBoolean(), reasonValidation],
  validate,
  controller.featureStore
);

router.get('/products', pagingValidation, validate, controller.listProducts);
router.get('/products/:productId', [mongoId('productId')], validate, controller.getProduct);
router.patch(
  '/products/:productId/status',
  [mongoId('productId'), body('status').isIn(['active', 'hidden', 'sold_out', 'inactive', 'kyc_pending']), reasonValidation],
  validate,
  controller.updateProductStatus
);
router.patch(
  '/products/:productId/feature',
  [mongoId('productId'), body('featured').optional().isBoolean(), reasonValidation],
  validate,
  controller.featureProduct
);
router.patch(
  '/products/:productId/stock',
  [
    mongoId('productId'),
    body('stock').optional().isInt({ min: 0 }),
    body('reservedStock').optional().isInt({ min: 0 }),
    body('lowStockThreshold').optional().isInt({ min: 0 }),
    reasonValidation
  ],
  validate,
  controller.updateProductStock
);
router.get('/products/:productId/history', [mongoId('productId')], validate, controller.getProductHistory);
router.get('/products/:productId/orders', [mongoId('productId')], validate, controller.getProductOrders);
router.get('/products/:productId/analytics', [mongoId('productId')], validate, controller.getProductAnalytics);

router.get('/reels', pagingValidation, validate, controller.listReels);
router.get('/reels/:reelId', [mongoId('reelId')], validate, controller.getReel);
router.patch(
  '/reels/:reelId/status',
  [mongoId('reelId'), body('status').isIn(['active', 'hidden', 'sold_out', 'removed']), reasonValidation],
  validate,
  controller.updateReelStatus
);
router.patch(
  '/reels/:reelId/feature',
  [mongoId('reelId'), body('featured').optional().isBoolean(), reasonValidation],
  validate,
  controller.featureReel
);
router.get('/reels/:reelId/comments', [mongoId('reelId')], validate, controller.getReelComments);
router.get('/reels/:reelId/analytics', [mongoId('reelId')], validate, controller.getReelAnalytics);
router.get('/reels/:reelId/reports', [mongoId('reelId')], validate, controller.getReelReports);

router.get('/comments', pagingValidation, validate, controller.listComments);
router.get('/comments/:commentId', [mongoId('commentId')], validate, controller.getComment);
router.patch(
  '/comments/:commentId/status',
  [mongoId('commentId'), body('status').isIn(['active', 'hidden', 'deleted']), reasonValidation],
  validate,
  controller.updateCommentStatus
);
router.delete('/comments/:commentId', [mongoId('commentId'), reasonValidation], validate, controller.deleteComment);

module.exports = router;
