const router = require('express').Router();

const { catalogueReadLimiter } = require('../../middleware/catalogueRateLimiter');
const { optionalAuthenticate } = require('../../middleware/auth.middleware');
const searchController = require('./search.controller');

router.get('/global', optionalAuthenticate, catalogueReadLimiter, searchController.globalSearch);
router.get('/stores', optionalAuthenticate, catalogueReadLimiter, searchController.searchStores);
router.get('/products', optionalAuthenticate, catalogueReadLimiter, searchController.searchProducts);
router.get('/reels', optionalAuthenticate, catalogueReadLimiter, searchController.searchReels);

module.exports = router;
