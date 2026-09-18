const router = require('express').Router();

const { optionalAuthenticate } = require('../../middleware/auth.middleware');
const { catalogueReadLimiter } = require('../../middleware/catalogueRateLimiter');
const trendingController = require('./trending.controller');

router.get('/stores', optionalAuthenticate, catalogueReadLimiter, trendingController.getTrendingStores);
router.get('/regions', trendingController.getTrendingRegions);
router.get('/hashtags', trendingController.getTrendingHashtags);
router.get('/products', optionalAuthenticate, catalogueReadLimiter, trendingController.getTrendingProducts);

module.exports = router;
