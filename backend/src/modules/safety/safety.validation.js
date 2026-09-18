const { body, param, query } = require('express-validator');

const targetTypes = ['reel', 'product', 'comment', 'store', 'user'];
const reportReasons = ['spam', 'harassment', 'hate', 'nudity', 'violence', 'scam', 'counterfeit', 'self_harm', 'other'];
const reportStatuses = ['pending', 'reviewing', 'resolved', 'dismissed'];
const moderationActions = ['no_action', 'hide_content', 'restore_content', 'warn_user', 'suspend_user', 'dismiss_report'];

const createReportValidation = [
  body('targetType').isIn(targetTypes).withMessage('Invalid report target type'),
  body('targetId').isMongoId().withMessage('A valid target id is required'),
  body('reason').isIn(reportReasons).withMessage('Invalid report reason'),
  body('details').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Report details are too long')
];

const userIdParamValidation = [
  param('userId').isMongoId().withMessage('A valid user id is required')
];

const listReportsValidation = [
  query('status').optional().isIn(reportStatuses).withMessage('Invalid report status'),
  query('targetType').optional().isIn(targetTypes).withMessage('Invalid report target type'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt()
];

const resolveReportValidation = [
  param('id').isMongoId().withMessage('A valid report id is required'),
  body('status').optional().isIn(['resolved', 'dismissed']).withMessage('Invalid resolution status'),
  body('action').isIn(moderationActions).withMessage('Invalid moderation action'),
  body('note').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Resolution note is too long')
];

module.exports = {
  createReportValidation,
  userIdParamValidation,
  listReportsValidation,
  resolveReportValidation
};
