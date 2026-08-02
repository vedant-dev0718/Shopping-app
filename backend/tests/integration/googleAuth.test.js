process.env.GOOGLE_WEB_CLIENT_ID = 'web-client-id.apps.googleusercontent.com';
process.env.GOOGLE_IOS_CLIENT_ID = 'ios-client-id.apps.googleusercontent.com';

const mockGooglePayloads = {
  buyerToken: {
    sub: 'google-buyer-1',
    email: 'google-buyer@example.com',
    email_verified: true,
    name: 'Google Buyer',
    picture: 'https://example.com/buyer.jpg'
  },
  sellerToken: {
    sub: 'google-seller-1',
    email: 'google-seller@example.com',
    email_verified: true,
    name: 'Google Seller',
    picture: 'https://example.com/seller.jpg'
  },
  existingToken: {
    sub: 'google-existing-1',
    email: 'existing-google@example.com',
    email_verified: true,
    name: 'Existing Buyer'
  },
  unverifiedToken: {
    sub: 'google-unverified-1',
    email: 'unverified-google@example.com',
    email_verified: false,
    name: 'Unverified Buyer'
  },
  suspendedToken: {
    sub: 'google-suspended-1',
    email: 'suspended-google@example.com',
    email_verified: true,
    name: 'Suspended Buyer'
  }
};

const mockVerifyIdToken = jest.fn(async ({ idToken, audience }) => {
  if (!audience.includes(process.env.GOOGLE_WEB_CLIENT_ID)) {
    throw new Error('unexpected audience');
  }

  const payload = mockGooglePayloads[idToken];

  if (!payload) {
    throw new Error('invalid token');
  }

  return {
    getPayload: () => payload
  };
});

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken
  }))
}));

const bcrypt = require('bcrypt');

const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer } = require('../helpers/auth.helper');
const BuyerProfile = require('../../src/modules/buyers/buyerProfile.model');
const SellerProfile = require('../../src/modules/sellers/sellerProfile.model');
const Store = require('../../src/modules/stores/store.model');
const User = require('../../src/modules/users/user.model');

describe('Google auth API', () => {
  test('creates a new Google buyer and returns a NotWhat JWT', async () => {
    const res = await api()
      .post('/api/auth/google')
      .send({ idToken: 'buyerToken', role: 'buyer' })
      .expect(201);

    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('google-buyer@example.com');
    expect(res.body.data.user.role).toBe('buyer');
    expect(res.body.data.user.isEmailVerified).toBe(true);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.isNewUser).toBe(true);
    expect(res.body.data.requiresRoleSelection).toBe(false);
    expect(res.body.data.requiresSellerProfileSetup).toBe(false);

    const user = await User.findOne({ email: 'google-buyer@example.com' }).select('+passwordHash');
    expect(user.passwordHash).toBeUndefined();
    expect(user.googleId).toBe('google-buyer-1');
    expect(user.signupProvider).toBe('google');
    expect(user.authProviders).toHaveLength(1);
    expect(await BuyerProfile.findOne({ userId: user._id })).toBeTruthy();
  });

  test('creates a new Google seller and completes seller profile setup', async () => {
    const login = await api()
      .post('/api/auth/google')
      .send({ idToken: 'sellerToken', role: 'seller' })
      .expect(201);

    expect(login.body.data.token).toBeTruthy();
    expect(login.body.data.user.role).toBe('seller');
    expect(login.body.data.user.accountStatus).toBe('pending_profile');
    expect(login.body.data.requiresSellerProfileSetup).toBe(true);

    const user = await User.findOne({ email: 'google-seller@example.com' });
    expect(await Store.findOne({ sellerId: user._id })).toBeNull();
    expect(await SellerProfile.findOne({ userId: user._id })).toBeNull();

    const setup = await api()
      .post('/api/auth/google/complete-profile')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({
        storeName: 'Google Seller Studio',
        storeCategory: 'Handloom',
        city: 'Jaipur',
        state: 'Rajasthan',
        specialtyRegion: 'Rajasthan',
        storeDescription: 'Regional finds from a Google seller.',
        phone: '9999999999'
      })
      .expect(200);

    expect(setup.body.data.user.accountStatus).toBe('active');
    expect(setup.body.data.requiresSellerProfileSetup).toBe(false);
    expect(setup.body.data.sellerProfile.storeName).toBe('Google Seller Studio');
    expect(setup.body.data.store.storeName).toBe('Google Seller Studio');
  });

  test('links Google to an existing password user by verified email', async () => {
    const passwordHash = await bcrypt.hash('Password1!', 10);
    await User.create({
      name: 'Existing Google',
      email: 'existing-google@example.com',
      passwordHash,
      phone: '9999999999',
      role: 'buyer',
      accountStatus: 'active'
    });

    const res = await api()
      .post('/api/auth/google')
      .send({ idToken: 'existingToken' })
      .expect(200);

    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.isNewUser).toBe(false);
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const user = await User.findOne({ email: 'existing-google@example.com' }).select('+passwordHash');
    expect(user.passwordHash).toBe(passwordHash);
    expect(user.googleId).toBe('google-existing-1');
    expect(user.authProviders.some((provider) => provider.provider === 'google')).toBe(true);
    expect(user.isEmailVerified).toBe(true);
  });

  test('does not duplicate a user for repeated Google login', async () => {
    await api()
      .post('/api/auth/google')
      .send({ idToken: 'buyerToken', role: 'buyer' })
      .expect(201);

    await api()
      .post('/api/auth/google')
      .send({ idToken: 'buyerToken' })
      .expect(200);

    expect(await User.countDocuments({ email: 'google-buyer@example.com' })).toBe(1);
    const user = await User.findOne({ email: 'google-buyer@example.com' });
    expect(user.authProviders.filter((provider) => provider.provider === 'google')).toHaveLength(1);
  });

  test('handles missing role for a new Google user without creating an account', async () => {
    const res = await api()
      .post('/api/auth/google')
      .send({ idToken: 'buyerToken' })
      .expect(200);

    expect(res.body.data.token).toBeNull();
    expect(res.body.data.user).toBeNull();
    expect(res.body.data.requiresRoleSelection).toBe(true);
    expect(await User.countDocuments({ email: 'google-buyer@example.com' })).toBe(0);
  });

  test('rejects invalid and unverified Google tokens', async () => {
    await api()
      .post('/api/auth/google')
      .send({ idToken: 'invalidToken', role: 'buyer' })
      .expect(401);

    await api()
      .post('/api/auth/google')
      .send({ idToken: 'unverifiedToken', role: 'buyer' })
      .expect(401);
  });

  test('rejects suspended users signing in with Google', async () => {
    await User.create({
      name: 'Suspended Google',
      email: 'suspended-google@example.com',
      passwordHash: await bcrypt.hash('Password1!', 10),
      phone: '9999999999',
      role: 'buyer',
      accountStatus: 'suspended'
    });

    await api()
      .post('/api/auth/google')
      .send({ idToken: 'suspendedToken' })
      .expect(403);
  });

  test('keeps password login working after Google changes', async () => {
    const user = await createBuyer({ email: 'password-still-works@example.com' });

    const login = await api()
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Password1!' })
      .expect(200);

    expect(login.body.data.token).toBeTruthy();
    expect(login.body.data.user.passwordHash).toBeUndefined();

    await api()
      .get('/api/auth/me')
      .set('Authorization', authHeader(user))
      .expect(200);
  });
});
