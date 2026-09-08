const router = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const controller = require('./notification.controller');
const { registerDeviceTokenRules, removeDeviceTokenRules } = require('./notification.validation');

router.use('/notifications', authenticate);
router.post('/notifications/device-token', registerDeviceTokenRules, validate, controller.registerDeviceToken);
router.delete('/notifications/device-token', removeDeviceTokenRules, validate, controller.removeDeviceToken);

module.exports = router;
