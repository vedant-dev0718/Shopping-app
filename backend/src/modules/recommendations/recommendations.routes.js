const router = require('express').Router();

const { authenticate } = require('../../middleware/auth.middleware');
const { requireBuyer } = require('../../middleware/role.middleware');
const recommendationsController = require('./recommendations.controller');

router.use(authenticate, requireBuyer);

router.get('/products', recommendationsController.getProducts);
router.get('/reels', recommendationsController.getReels);

module.exports = router;
