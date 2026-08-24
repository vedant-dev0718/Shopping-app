const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../../src/modules/users/user.model');
const BuyerProfile = require('../../src/modules/buyers/buyerProfile.model');
const SellerProfile = require('../../src/modules/sellers/sellerProfile.model');
const Store = require('../../src/modules/stores/store.model');

const password = 'Password1!';

const tokenFor = (user) => jwt.sign(
  { id: user._id.toString(), role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
);

const authHeader = (user) => `Bearer ${tokenFor(user)}`;

const createUser = async (overrides = {}) => {
  const role = overrides.role || 'buyer';
  const user = {
    name: overrides.name || `${role} Test User`,
    email: overrides.email || `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    passwordHash: await bcrypt.hash(overrides.password || password, 10),
    phone: overrides.phone || '9999999999',
    address: overrides.address || '123 Test Street',
    role,
    accountStatus: overrides.accountStatus || 'active'
  };

  if (overrides.adminTotpSecret) {
    user.adminTotpSecret = overrides.adminTotpSecret;
    user.adminTotpEnabled = overrides.adminTotpEnabled !== false;
    user.adminTotpConfiguredAt = overrides.adminTotpConfiguredAt || new Date();
  }

  return User.create(user);
};

const createBuyer = async (overrides = {}) => {
  const user = await createUser({ ...overrides, role: 'buyer' });
  await BuyerProfile.create({
    userId: user._id,
    savedProducts: [],
    savedStores: [],
    watchedReels: [],
    preferredRegions: [],
    preferredCategories: []
  });
  return user;
};

const createSeller = async (overrides = {}) => {
  const user = await createUser({ ...overrides, role: 'seller' });
  const store = await Store.create({
    sellerId: user._id,
    storeName: overrides.storeName || 'QA Heritage Store',
    category: overrides.storeCategory || 'Handloom',
    city: overrides.city || 'Jaipur',
    state: overrides.state || 'Rajasthan',
    region: overrides.region || 'Rajasthan',
    description: overrides.storeDescription || 'A test store for automated QA coverage.',
    verified: true
  });
  await SellerProfile.create({
    userId: user._id,
    storeId: store._id,
    storeName: store.storeName,
    storeCategory: store.category,
    city: store.city,
    state: store.state,
    specialtyRegion: store.region,
    storeDescription: store.description,
    kycStatus: overrides.kycStatus || 'verified',
    upiId: overrides.upiId || '',
    bankAccount: {
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      bankName: '',
      isVerified: false
    },
    pickupAddress: {
      name: overrides.pickupName || 'QA Pickup',
      phone: overrides.pickupPhone || '9999999999',
      address: overrides.pickupAddress || 'Seller pickup address',
      pincode: overrides.pickupPincode || '302001'
    }
  });
  user.testStore = store;
  return user;
};

const createAdmin = async (overrides = {}) => createUser({ ...overrides, role: 'admin' });

module.exports = {
  password,
  tokenFor,
  authHeader,
  createUser,
  createBuyer,
  createSeller,
  createAdmin
};
