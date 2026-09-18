const Product = require('../../src/modules/products/product.model');
const Reel = require('../../src/modules/reels/reel.model');

const buyerSignupPayload = (overrides = {}) => ({
  name: 'Buyer QA',
  email: `buyer-${Date.now()}@example.com`,
  password: 'Password1!',
  phone: '9999999999',
  address: '123 QA Street',
  ...overrides
});

const sellerSignupPayload = (overrides = {}) => ({
  name: 'Seller QA',
  email: `seller-${Date.now()}@example.com`,
  password: 'Password1!',
  phone: '9999999999',
  storeName: 'QA Store',
  storeCategory: 'Crafts',
  city: 'Jaipur',
  state: 'Rajasthan',
  specialtyRegion: 'Rajasthan',
  storeDescription: 'Automated seller test store.',
  ...overrides
});

const productPayload = (overrides = {}) => ({
  title: 'Handmade QA Bag',
  description: 'Durable handmade test product',
  category: 'Bags',
  region: 'Rajasthan',
  price: 250,
  stock: 4,
  tags: ['qa', 'handmade'],
  imageUrls: ['https://example.com/product.jpg'],
  ...overrides
});

const createProduct = async (seller, overrides = {}) => Product.create({
  sellerId: seller._id,
  storeId: seller.testStore._id,
  ...productPayload(overrides),
  status: overrides.status || (overrides.stock === 0 ? 'sold_out' : 'active')
});

const createReel = async (seller, products = [], overrides = {}) => Reel.create({
  sellerId: seller._id,
  storeId: seller.testStore._id,
  videoUrl: overrides.videoUrl || 'https://example.com/reel.mp4',
  thumbnailUrl: overrides.thumbnailUrl || 'https://example.com/reel.jpg',
  caption: overrides.caption || 'QA reel',
  hashtags: overrides.hashtags || ['qa'],
  region: overrides.region || 'Rajasthan',
  category: overrides.category || 'Bags',
  taggedProductIds: products.map((product) => product._id),
  status: overrides.status || 'active'
});

module.exports = {
  buyerSignupPayload,
  sellerSignupPayload,
  productPayload,
  createProduct,
  createReel
};
