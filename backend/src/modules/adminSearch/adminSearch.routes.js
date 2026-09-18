const router = require('express').Router();

const validate = require('../../middleware/validate.middleware');
const adminSearchController = require('./adminSearch.controller');
const { adminSearchValidation } = require('./adminSearch.validation');

router.get('/', adminSearchValidation, validate, adminSearchController.search);

module.exports = router;
