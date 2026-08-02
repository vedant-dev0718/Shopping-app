const { query } = require('express-validator');

const ADMIN_SEARCH_TYPES = [
  'all',
  'users',
  'sellers',
  'stores',
  'products',
  'reels',
  'comments',
  'orders',
  'payments',
  'refunds',
  'returns',
  'shipments',
  'payouts',
  'support',
  'reports',
  'blocks',
  'moderation',
  'moderationActions',
  'actions',
  'actionLogs',
  'adminActionLogs',
  'content',
  'legal',
  'pages',
  'settings',
  'appSettings',
  'categories',
  'regions',
  'featured',
  'featuredContent'
];

const adminSearchValidation = [
  query('q')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 })
    .withMessage('Search query must be 120 characters or fewer'),
  query('type')
    .optional({ checkFalsy: true })
    .isIn(ADMIN_SEARCH_TYPES)
    .withMessage('Invalid search type'),
  query('status')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 })
    .withMessage('Status must be 80 characters or fewer'),
  query('fromDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('fromDate must be a valid ISO date')
    .toDate(),
  query('toDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('toDate must be a valid ISO date')
    .toDate()
];

module.exports = {
  ADMIN_SEARCH_TYPES,
  adminSearchValidation
};
