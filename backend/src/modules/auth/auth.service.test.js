const assert = require('node:assert/strict');
const test = require('node:test');

class FakeId {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

const query = (value) => ({
  session() {
    return this;
  },
  select() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  }
});

const installMock = (request, exports) => {
  const resolved = require.resolve(request);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports
  };
};

const loadAuthService = ({ user, sellerProfile = null }) => {
  const calls = [];
  const servicePath = require.resolve('./auth.service');
  delete require.cache[servicePath];

  const record = (model, method, args, value = { acknowledged: true }) => {
    calls.push({ model, method, args });
    return query(value);
  };

  installMock('bcrypt', {
    hash: async () => 'hashed-deleted-password'
  });
  installMock('../users/user.model', {
    findById: (id) => {
      calls.push({ model: 'User', method: 'findById', args: [id] });
      return {
        select: () => query(user)
      };
    },
    findOne: (...args) => record('User', 'findOne', args)
  });
  installMock('../buyers/buyerProfile.model', {
    create: (...args) => record('BuyerProfile', 'create', args),
    findOne: (...args) => record('BuyerProfile', 'findOne', args),
    updateOne: (...args) => record('BuyerProfile', 'updateOne', args)
  });
  installMock('../sellers/sellerProfile.model', {
    create: (...args) => record('SellerProfile', 'create', args),
    findOne: (...args) => record('SellerProfile', 'findOne', args, sellerProfile),
    updateOne: (...args) => record('SellerProfile', 'updateOne', args)
  });
  installMock('../stores/store.model', {
    create: (...args) => record('Store', 'create', args),
    findById: (...args) => record('Store', 'findById', args),
    updateOne: (...args) => record('Store', 'updateOne', args),
    updateMany: (...args) => record('Store', 'updateMany', args)
  });
  installMock('../products/product.model', {
    updateMany: (...args) => record('Product', 'updateMany', args)
  });
  installMock('../reels/reel.model', {
    updateMany: (...args) => record('Reel', 'updateMany', args)
  });
  installMock('../cart/cart.model', {
    deleteOne: (...args) => record('Cart', 'deleteOne', args)
  });
  installMock('../likes/like.model', {
    deleteMany: (...args) => record('Like', 'deleteMany', args)
  });
  installMock('../comments/comment.model', {
    updateMany: (...args) => record('Comment', 'updateMany', args)
  });
  installMock('../analytics/analyticsEvent.model', {
    updateMany: (...args) => record('AnalyticsEvent', 'updateMany', args)
  });
  installMock('./tokenBlacklist.model', {
    findOneAndUpdate: (...args) => record('TokenBlacklist', 'findOneAndUpdate', args)
  });

  return {
    authService: require('./auth.service'),
    calls
  };
};

const makeUser = (role, idValue) => {
  const user = {
    _id: new FakeId(idValue),
    role,
    name: `${role} user`,
    email: `${role}@example.com`,
    phone: '9999999999',
    address: '123 Market Lane',
    passwordHash: 'old-hash',
    accountStatus: 'active',
    authInvalidatedAt: null,
    deletedAt: null,
    savedWith: null,
    async save(options) {
      this.savedWith = options;
    }
  };

  return user;
};

test('deleteAccount anonymizes a buyer and removes buyer-owned session data', async () => {
  const user = makeUser('buyer', 'buyer-123');
  const { authService, calls } = loadAuthService({ user });

  const result = await authService.deleteAccount({ id: 'buyer-123' });

  assert.equal(result.accountDeleted, true);
  assert.equal(result.role, 'buyer');
  assert.equal(result.authRevoked, true);
  assert.equal(result.dependencies.buyerProfileScrubbed, true);
  assert.equal(result.dependencies.cartRemoved, true);
  assert.equal(result.dependencies.ordersRetainedForLegalAndSupport, true);
  assert.equal(user.name, 'Deleted NotWhat User');
  assert.equal(user.email, 'deleted-buyer-123@deleted.notwhat.local');
  assert.equal(user.phone, '');
  assert.equal(user.address, '');
  assert.equal(user.passwordHash, 'hashed-deleted-password');
  assert.equal(user.accountStatus, 'deleted');
  assert.ok(user.authInvalidatedAt instanceof Date);
  assert.ok(user.deletedAt instanceof Date);

  const buyerProfileCall = calls.find((call) => call.model === 'BuyerProfile' && call.method === 'updateOne');
  assert.deepEqual(buyerProfileCall.args[0], { userId: user._id });
  assert.deepEqual(buyerProfileCall.args[1].$set, {
    savedProducts: [],
    savedStores: [],
    watchedReels: [],
    preferredRegions: [],
    preferredCategories: []
  });

  assert.ok(calls.some((call) => call.model === 'Cart' && call.method === 'deleteOne'));
  assert.ok(calls.some((call) => call.model === 'Like' && call.method === 'deleteMany'));
  assert.ok(calls.some((call) => call.model === 'Comment' && call.method === 'updateMany'));
  assert.ok(calls.some((call) => call.model === 'Store' && call.method === 'updateMany'));
  assert.ok(calls.some((call) => call.model === 'AnalyticsEvent' && call.method === 'updateMany'));
});

test('deleteAccount anonymizes a seller and safely disables seller dependencies', async () => {
  const user = makeUser('seller', 'seller-123');
  const storeId = new FakeId('store-123');
  const { authService, calls } = loadAuthService({
    user,
    sellerProfile: { storeId }
  });

  const result = await authService.deleteAccount({ id: 'seller-123' });

  assert.equal(result.accountDeleted, true);
  assert.equal(result.role, 'seller');
  assert.equal(result.authRevoked, true);
  assert.equal(result.dependencies.storeId, storeId);
  assert.equal(result.dependencies.productsDeactivated, true);
  assert.equal(result.dependencies.reelsHidden, true);
  assert.equal(result.dependencies.ordersRetainedForLegalAndSupport, true);
  assert.equal(user.email, 'deleted-seller-123@deleted.notwhat.local');
  assert.equal(user.passwordHash, 'hashed-deleted-password');
  assert.equal(user.accountStatus, 'deleted');
  assert.ok(user.authInvalidatedAt instanceof Date);
  assert.ok(user.deletedAt instanceof Date);

  const sellerProfileCall = calls.find((call) => call.model === 'SellerProfile' && call.method === 'updateOne');
  assert.deepEqual(sellerProfileCall.args[0], { userId: user._id });
  assert.deepEqual(sellerProfileCall.args[1].$set, {
    bankAccount: {
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      bankName: '',
      isVerified: false
    },
    upiId: '',
    panNumber: '',
    gstNumber: '',
    kycStatus: 'not_submitted',
    razorpayLinkedAccountId: '',
    razorpayLinkedAccountStatus: 'not_created'
  });

  const storeCall = calls.find((call) => call.model === 'Store' && call.method === 'updateOne');
  assert.deepEqual(storeCall.args[0], { sellerId: user._id });
  assert.equal(storeCall.args[1].$set.storeName, 'Deleted seller store');
  assert.equal(storeCall.args[1].$set.verified, false);

  const productCall = calls.find((call) => call.model === 'Product' && call.method === 'updateMany');
  assert.deepEqual(productCall.args, [
    { sellerId: user._id },
    { $set: { status: 'inactive', featured: false } }
  ]);

  const reelCall = calls.find((call) => call.model === 'Reel' && call.method === 'updateMany');
  assert.deepEqual(reelCall.args, [
    { sellerId: user._id },
    { $set: { status: 'hidden' } }
  ]);
});
