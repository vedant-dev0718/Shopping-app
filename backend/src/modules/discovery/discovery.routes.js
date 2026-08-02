const router = require('express').Router();

const { optionalAuthenticate } = require('../../middleware/auth.middleware');
const { catalogueReadLimiter } = require('../../middleware/catalogueRateLimiter');
const discoveryController = require('./discovery.controller');

router.get('/feed', optionalAuthenticate, catalogueReadLimiter, discoveryController.getFeed);
router.get('/categories', discoveryController.getCategories);
router.get('/regions', discoveryController.getRegions);
router.get('/featured-stores', optionalAuthenticate, catalogueReadLimiter, discoveryController.getFeaturedStores);

module.exports = router;
