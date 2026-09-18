const router = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const safetyController = require('./safety.controller');
const {
  createReportValidation,
  userIdParamValidation
} = require('./safety.validation');

router.use(authenticate);

router.post('/reports', createReportValidation, validate, safetyController.createReport);
router.get('/blocks', safetyController.listBlockedUsers);
router.post('/blocks/:userId', userIdParamValidation, validate, safetyController.blockUser);
router.delete('/blocks/:userId', userIdParamValidation, validate, safetyController.unblockUser);

module.exports = router;
