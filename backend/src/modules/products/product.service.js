const AppError = require('../../utils/AppError');
const analyticsService = require('../analytics/analytics.service');
const BuyerProfile = require('../buyers/buyerProfile.model');
const SellerProfile = require('../sellers/sellerProfile.model');
const Store = require('../stores/store.model');
const safetyService = require('../safety/safety.service');
const Product = require('./product.model');

const PUBLIC_PRODUCT_STATUSES = ['active', 'sold_out'];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const exactTextFilter = (value) => new RegExp(`^${escapeRegExp(value)}$`, 'i');

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean);
};

const applyStockStatus = (productData) => {
  if (productData.status === 'kyc_pending') {
    return productData;
  }

  if (productData.stock === 0) {
    return {
      ...productData,
      status: 'sold_out'
    };
  }

  return productData;
};

const buildBaseProductQuery = (filters = {}) => {
  const query = {};

  if (filters.status && PUBLIC_PRODUCT_STATUSES.includes(filters.status)) {
    query.status = filters.status;
  } else {
    query.status = { $in: PUBLIC_PRODUCT_STATUSES };
  }

  if (filters.category) {
    query.category = exactTextFilter(filters.category);
  }

  if (filters.region) {
    query.region = exactTextFilter(filters.region);
  }

  if (filters.seller) {
    query.sellerId = filters.seller;
  }

  if (filters.store) {
    query.storeId = filters.store;
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    query.price = {};

    if (filters.minPrice !== undefined) {
      query.price.$gte = Number(filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query.price.$lte = Number(filters.maxPrice);
    }
  }

  return query;
};

const applyStoreLocationFilters = async (query, filters = {}) => {
  if (!filters.city && !filters.state) {
    return { query };
  }

  const storeQuery = {};

  if (filters.city) {
    storeQuery.city = exactTextFilter(filters.city);
  }

  if (filters.state) {
    storeQuery.state = exactTextFilter(filters.state);
  }

  const storeIds = await Store.find(storeQuery).distinct('_id');

  if (storeIds.length === 0) {
    return { query, empty: true };
  }

  if (query.storeId) {
    const storeMatchesLocation = storeIds.some((storeId) => storeId.toString() === query.storeId.toString());

    return {
      query,
      empty: !storeMatchesLocation
    };
  }

  return {
    query: {
      ...query,
      storeId: { $in: storeIds }
    }
  };
};

const getSavedProductIds = async (user = null) => {
  if (!user || user.role !== 'buyer') {
    return new Set();
  }

  const buyerProfile = await BuyerProfile.findOne({ userId: user.id }).select('savedProducts').lean();
  return new Set((buyerProfile?.savedProducts || []).map((id) => id.toString()));
};

const withSavedProducts = (products = [], savedProductIds = new Set()) => {
  return products.map((product) => ({
    ...product,
    isSaved: savedProductIds.has(product._id.toString())
  }));
};

const withSavedProduct = (product, savedProductIds = new Set()) => ({
  ...product,
  isSaved: savedProductIds.has(product._id.toString())
});

const getProducts = async (filters = {}, user = null) => {
  const baseQuery = buildBaseProductQuery(filters);
  const { query, empty } = await applyStoreLocationFilters(baseQuery, filters);

  if (empty) {
    return [];
  }

  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const savedProductIds = await getSavedProductIds(user);

  const products = await Product.find(safetyService.applySafetyQuery(query, safetyContext, { targetType: 'product' }))
    .populate('storeId', 'storeName city state region category')
    .sort({ featured: -1, createdAt: -1 })
    .lean();

  return withSavedProducts(products, savedProductIds);
};

const getProductById = async (productId, user = null) => {
  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const savedProductIds = await getSavedProductIds(user);
  const product = await Product.findOne({
    ...safetyService.applySafetyQuery({ _id: productId }, safetyContext, { targetType: 'product' }),
    status: { $in: PUBLIC_PRODUCT_STATUSES }
  })
    .populate('storeId', 'storeName city state region category')
    .lean();

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return withSavedProduct(product, savedProductIds);
};

const getRelatedProducts = async (productId, user = null) => {
  const product = await getProductById(productId, user);
  const safetyContext = await safetyService.getViewerSafetyContext(user);
  const savedProductIds = await getSavedProductIds(user);

  const products = await Product.find(safetyService.applySafetyQuery({
    _id: { $ne: product._id },
    status: { $in: PUBLIC_PRODUCT_STATUSES },
    $or: [
      { category: product.category },
      { region: product.region },
      { storeId: product.storeId }
    ]
  }, safetyContext, { targetType: 'product' }))
    .limit(8)
    .sort({ featured: -1, createdAt: -1 })
    .lean();

  return withSavedProducts(products, savedProductIds);
};

const getBuyerProfile = async (userId) => {
  const buyerProfile = await BuyerProfile.findOne({ userId });

  if (!buyerProfile) {
    throw new AppError('Buyer profile not found', 404);
  }

  return buyerProfile;
};

const saveProduct = async (productId, user) => {
  const product = await Product.findOne({
    _id: productId,
    status: { $in: PUBLIC_PRODUCT_STATUSES }
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const buyerProfile = await getBuyerProfile(user.id);
  const alreadySaved = buyerProfile.savedProducts.some((savedProductId) => {
    return savedProductId.toString() === product._id.toString();
  });

  if (!alreadySaved) {
    buyerProfile.savedProducts.push(product._id);
    product.saveCount += 1;
    await Promise.all([buyerProfile.save(), product.save()]);
    await analyticsService.trackEventSafe({
      userId: user.id,
      sellerId: product.sellerId,
      storeId: product.storeId,
      productId: product._id,
      eventType: 'product_save'
    });
  }

  return {
    productId: product._id,
    saved: true,
    saveCount: product.saveCount
  };
};

const unsaveProduct = async (productId, user) => {
  const product = await Product.findOne({
    _id: productId,
    status: { $in: PUBLIC_PRODUCT_STATUSES }
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const buyerProfile = await getBuyerProfile(user.id);
  const initialSavedCount = buyerProfile.savedProducts.length;
  buyerProfile.savedProducts = buyerProfile.savedProducts.filter((savedProductId) => {
    return savedProductId.toString() !== product._id.toString();
  });

  const wasSaved = buyerProfile.savedProducts.length !== initialSavedCount;

  if (wasSaved) {
    product.saveCount = Math.max(product.saveCount - 1, 0);
    await Promise.all([buyerProfile.save(), product.save()]);
  }

  return {
    productId: product._id,
    saved: false,
    saveCount: product.saveCount
  };
};

const recordProductClick = async (productId, user = null) => {
  const product = await Product.findOneAndUpdate(
    {
      _id: productId,
      status: { $in: PUBLIC_PRODUCT_STATUSES }
    },
    { $inc: { clickCount: 1 } },
    { new: true }
  );

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  await analyticsService.trackEventSafe({
    userId: user ? user.id : null,
    sellerId: product.sellerId,
    storeId: product.storeId,
    productId: product._id,
    eventType: 'product_click'
  });

  return {
    productId: product._id,
    clickCount: product.clickCount
  };
};

const findSellerStore = async (sellerId, requestedStoreId = null) => {
  const storeQuery = {
    sellerId
  };

  if (requestedStoreId) {
    storeQuery._id = requestedStoreId;
  }

  const store = await Store.findOne(storeQuery);

  if (!store) {
    throw new AppError('Seller store not found', 404);
  }

  return store;
};

const getSellerProfile = async (sellerId) => {
  const profile = await SellerProfile.findOne({ userId: sellerId });

  if (!profile) {
    throw new AppError('Seller profile not found', 404);
  }

  return profile;
};

const resolveKycGatedProductStatus = (_profile, requestedStatus = 'active') => {
  // KYC remains on the seller profile for future rollout, but product publishing
  // is intentionally open while marketplace flows are being tested.
  return requestedStatus || 'active';
};

const createSellerProduct = async (user, data) => {
  const store = await findSellerStore(user.id, data.storeId);
  const sellerProfile = await getSellerProfile(user.id);
  const status = resolveKycGatedProductStatus(sellerProfile, data.status || 'active');
  const productData = applyStockStatus({
    sellerId: user.id,
    storeId: store._id,
    title: data.title,
    description: data.description,
    productLink: data.productLink || '',
    category: data.category,
    subcategory: data.subcategory || '',
    region: data.region,
    price: data.price,
    stock: data.stock ?? 0,
    tags: normalizeStringArray(data.tags),
    imageUrls: normalizeStringArray(data.imageUrls),
    featured: data.featured || false,
    status
  });

  return Product.create(productData);
};

const getSellerProducts = async (sellerId) => {
  return Product.find({ sellerId })
    .populate('storeId', 'storeName city state region category')
    .sort({ createdAt: -1 })
    .lean();
};

const updateSellerProduct = async (user, productId, data) => {
  const product = await Product.findOne({
    _id: productId,
    sellerId: user.id
  });

  if (!product) {
    throw new AppError('Product not found for this seller', 404);
  }

  if (data.storeId) {
    const store = await findSellerStore(user.id, data.storeId);
    product.storeId = store._id;
  }

  let sellerProfile = null;
  if (data.status !== undefined || product.status === 'kyc_pending') {
    sellerProfile = await getSellerProfile(user.id);
  }

  const updatableFields = [
    'title',
    'description',
    'productLink',
    'category',
    'subcategory',
    'region',
    'price',
    'stock',
    'featured',
    'status'
  ];

  updatableFields.forEach((field) => {
    if (data[field] !== undefined) {
      product[field] = data[field];
    }
  });

  if (data.tags !== undefined) {
    product.tags = normalizeStringArray(data.tags);
  }

  if (data.imageUrls !== undefined) {
    product.imageUrls = normalizeStringArray(data.imageUrls);
  }

  if (sellerProfile) {
    product.status = resolveKycGatedProductStatus(sellerProfile, product.status);
  }

  if (product.stock === 0) {
    product.status = product.status === 'kyc_pending' ? 'kyc_pending' : 'sold_out';
  }

  return product.save();
};

const deleteSellerProduct = async (user, productId) => {
  const product = await Product.findOneAndDelete({
    _id: productId,
    sellerId: user.id
  });

  if (!product) {
    throw new AppError('Product not found for this seller', 404);
  }

  await BuyerProfile.updateMany(
    { savedProducts: product._id },
    { $pull: { savedProducts: product._id } }
  );

  return {
    productId: product._id,
    deleted: true
  };
};

module.exports = {
  getProducts,
  getProductById,
  getRelatedProducts,
  saveProduct,
  unsaveProduct,
  recordProductClick,
  getSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct
};
