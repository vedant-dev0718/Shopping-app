const { body, query } = require('express-validator');

const registerDeviceTokenRules = [
  body('fcmToken').isString().trim().notEmpty().withMessage('fcmToken is required'),
  body('platform').isIn(['ios', 'android']).withMessage('platform must be ios or android'),
  body('appVersion').optional().isString().trim()
];

const removeDeviceTokenRules = [
  query('fcmToken').isString().trim().notEmpty().withMessage('fcmToken is required')
];

module.exports = {
  registerDeviceTokenRules,
  removeDeviceTokenRules
};
