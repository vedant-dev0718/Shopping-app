const router = require('express').Router();

const { optionalAuthenticate } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const contactController = require('./contact.controller');
const { supportRequestValidation } = require('./contact.validation');

router.post('/support', optionalAuthenticate, supportRequestValidation, validate, contactController.submitSupportRequest);

module.exports = router;
