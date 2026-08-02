const router = require('express').Router();

const adminRoutes = require('../modules/admin/admin.routes');
const authRoutes = require('../modules/auth/auth.routes');
const bargainRoutes = require('../modules/bargain/bargain.routes');
const cartRoutes = require('../modules/cart/cart.routes');
const checkoutRoutes = require('../modules/checkout/checkout.routes');
const contactRoutes = require('../modules/contact/contact.routes');
const contentRoutes = require('../modules/content/content.routes');
const {
  productRoutes,
  sellerProductRoutes
} = require('../modules/products/product.routes');
const {
  reelRoutes,
  sellerReelRoutes
} = require('../modules/reels/reel.routes');
const {
  analyticsRoutes,
  sellerAnalyticsRoutes
} = require('../modules/analytics/analytics.routes');
const discoveryRoutes = require('../modules/discovery/discovery.routes');
const orderRoutes = require('../modules/orders/order.routes');
const recommendationsRoutes = require('../modules/recommendations/recommendations.routes');
const returnRoutes = require('../modules/returns/return.routes');
const searchRoutes = require('../modules/search/search.routes');
const sellerOrderRoutes = require('../modules/sellerOrders/sellerOrder.routes');
const sellerReturnRoutes = require('../modules/sellerOrders/sellerReturn.routes');
const sellerProfileRoutes = require('../modules/sellers/sellerProfile.routes');
const sellerPayoutRoutes = require('../modules/sellers/sellerPayout.routes');
const safetyRoutes = require('../modules/safety/safety.routes');
const storeRoutes = require('../modules/stores/store.routes');
const trendingRoutes = require('../modules/trending/trending.routes');
const uploadRoutes = require('../modules/uploads/upload.routes');
const addressRoutes = require('../modules/addresses/address.routes');
const shippingRoutes = require('../modules/shipping/shipping.routes');
const { successResponse } = require('../utils/apiResponse');

router.get('/health', (_req, res) => {
  return successResponse(res, {
    message: 'NotWhat API health check passed',
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

router.use('/admin', adminRoutes);
router.use('/', addressRoutes);
router.use('/auth', authRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/bargain', bargainRoutes);
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/contact', contactRoutes);
router.use('/content', contentRoutes);
router.use('/stores', storeRoutes);
router.use('/products', productRoutes);
router.use('/seller/products', sellerProductRoutes);
router.use('/reels', reelRoutes);
router.use('/seller/reels', sellerReelRoutes);
router.use('/seller/orders', sellerOrderRoutes);
router.use('/shipping', shippingRoutes);
router.use('/seller/returns', sellerReturnRoutes);
router.use('/sellers', sellerProfileRoutes);
router.use('/sellers', sellerPayoutRoutes);
router.use('/uploads', uploadRoutes);
router.use('/seller', sellerAnalyticsRoutes);
router.use('/discovery', discoveryRoutes);
router.use('/orders', orderRoutes);
router.use('/recommendations', recommendationsRoutes);
router.use('/returns', returnRoutes);
router.use('/safety', safetyRoutes);
router.use('/search', searchRoutes);
router.use('/trending', trendingRoutes);

module.exports = router;
