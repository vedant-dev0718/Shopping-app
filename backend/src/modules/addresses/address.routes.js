const router = require('express').Router();
const { body, param } = require('express-validator');

const { authenticate } = require('../../middleware/auth.middleware');
const { requireBuyer, requireSeller } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const { requireAuth, requireAdmin } = require('../admin/admin.middleware');
const controller = require('./address.controller');
const {
  sharedAddressRules,
  addressIdValidation,
  adminAddressListValidation
} = require('./address.validation');

router.use('/addresses', authenticate, requireBuyer);
router.get('/addresses/delivery', controller.listDeliveryAddresses);
router.post('/addresses/delivery', sharedAddressRules, validate, controller.createDeliveryAddress);
router.post('/addresses/delivery/validate', sharedAddressRules, validate, controller.validateDeliveryAddress);
router.get('/addresses/delivery/:addressId', addressIdValidation, validate, controller.getDeliveryAddress);
router.patch('/addresses/delivery/:addressId', [...addressIdValidation, ...sharedAddressRules], validate, controller.updateDeliveryAddress);
router.delete('/addresses/delivery/:addressId', addressIdValidation, validate, controller.deleteDeliveryAddress);
router.patch('/addresses/delivery/:addressId/default', addressIdValidation, validate, controller.setDefaultDeliveryAddress);

router.use('/seller/pickup-addresses', authenticate, requireSeller);
router.get('/seller/pickup-addresses', controller.listPickupAddresses);
router.post('/seller/pickup-addresses', sharedAddressRules, validate, controller.createPickupAddress);
router.post('/seller/pickup-addresses/validate', sharedAddressRules, validate, controller.validatePickupAddress);
router.get('/seller/pickup-addresses/:addressId', addressIdValidation, validate, controller.getPickupAddress);
router.patch('/seller/pickup-addresses/:addressId', [...addressIdValidation, ...sharedAddressRules], validate, controller.updatePickupAddress);
router.delete('/seller/pickup-addresses/:addressId', addressIdValidation, validate, controller.deletePickupAddress);
router.patch('/seller/pickup-addresses/:addressId/default', addressIdValidation, validate, controller.setDefaultPickupAddress);
router.post('/seller/pickup-addresses/:addressId/sync-shiprocket', addressIdValidation, validate, controller.syncPickupAddress);

router.use('/admin', requireAuth, requireAdmin);
router.get('/admin/addresses', adminAddressListValidation, validate, controller.adminListAddresses);
router.get('/admin/addresses/:addressId', addressIdValidation, validate, controller.adminGetAddress);
router.get('/admin/users/:userId/addresses', [param('userId').isMongoId().withMessage('A valid user id is required')], validate, controller.adminUserAddresses);
router.get('/admin/sellers/:sellerId/pickup-addresses', [param('sellerId').isMongoId().withMessage('A valid seller id is required')], validate, controller.adminSellerPickupAddresses);
router.patch('/admin/addresses/:addressId/verify', [
  ...addressIdValidation,
  body('isVerified').optional().isBoolean().withMessage('isVerified must be a boolean')
], validate, controller.adminVerifyAddress);
router.patch('/admin/addresses/:addressId/deactivate', addressIdValidation, validate, controller.adminDeactivateAddress);

module.exports = router;
