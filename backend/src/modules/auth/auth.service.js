const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const AppError = require('../../utils/AppError');
const env = require('../../config/env');
const generateToken = require('../../utils/generateToken');
const hashToken = require('../../utils/hashToken');
const { verifyTotpCode } = require('../../utils/totp');
const { getDefaultPickupAddress } = require('../../utils/pickupAddressDefaults');
const googleAuthService = require('../../services/googleAuth.service');
const appleAuthService = require('../../services/appleAuth.service');
const { sendPasswordResetOtpEmail, sendSignupOtpEmail } = require('../../utils/resendEmail');
const User = require('../users/user.model');
const BuyerProfile = require('../buyers/buyerProfile.model');
const SellerProfile = require('../sellers/sellerProfile.model');
const Store = require('../stores/store.model');
const Product = require('../products/product.model');
const Reel = require('../reels/reel.model');
const Cart = require('../cart/cart.model');
const Like = require('../likes/like.model');
const Comment = require('../comments/comment.model');
const AnalyticsEvent = require('../analytics/analyticsEvent.model');
const PendingSignup = require('./pendingSignup.model');
const PasswordResetOtp = require('./passwordResetOtp.model');
const TokenBlacklist = require('./tokenBlacklist.model');

const SALT_ROUNDS = 12;
const PASSWORD_RESET_OTP_TTL_MINUTES = 10;
const PASSWORD_RESET_TOKEN_EXPIRES_IN = '15m';
const PASSWORD_RESET_TOKEN_EXPIRES_MS = 15 * 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

const shouldUseTransactions = () => {
  return env.mongoUri.startsWith('mongodb+srv://') || env.mongoUri.includes('replicaSet=');
};

const runMaybeTransaction = async (operation) => {
  if (!shouldUseTransactions()) {
    return operation();
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await operation(session);
    });

    return result;
  } finally {
    session.endSession();
  }
};

const normalizeEmail = (email) => email.trim().toLowerCase();
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

const generateSignupOtp = () => env.signupOtpTestCode || crypto.randomInt(100000, 1000000).toString();
const generatePasswordResetOtp = () => env.passwordResetOtpTestCode || crypto.randomInt(100000, 1000000).toString();

const serializeUser = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isAdmin: user.isAdmin || user.role === 'admin',
  adminPermissions: user.adminPermissions || [],
  address: user.address,
  accountStatus: user.accountStatus,
  isEmailVerified: user.isEmailVerified || false,
  isPhoneVerified: user.isPhoneVerified || false,
  avatarUrl: user.avatarUrl || '',
  authProviders: user.authProviders || [],
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt
});

const createAuthPayload = (user, extra = {}) => {
  const token = generateToken({
    id: user._id.toString(),
    role: user.role,
    email: user.email
  });

  return {
    token,
    user: serializeUser(user),
    ...extra
  };
};

const ensureEmailAvailable = async (email, session) => {
  const existingUser = await User.findOne({ email }).session(session || null);

  if (existingUser) {
    throw new AppError('Email is already registered', 409);
  }
};

const publicPendingSignup = (pendingSignup) => ({
  verificationId: pendingSignup._id,
  email: pendingSignup.email,
  role: pendingSignup.role,
  expiresAt: pendingSignup.expiresAt,
  resendAvailableAt: pendingSignup.resendAvailableAt
});

const nowProviderLink = ({ provider, providerUserId, email }) => ({
  provider,
  providerUserId,
  email,
  linkedAt: new Date()
});

const ensurePasswordProvider = (user) => {
  user.authProviders = user.authProviders || [];
  const hasPasswordProvider = user.authProviders.some((authProvider) => {
    return authProvider.provider === 'password';
  });

  if (!hasPasswordProvider) {
    user.authProviders.push(nowProviderLink({
      provider: 'password',
      providerUserId: user.email,
      email: user.email
    }));
  }
};

const linkAppleProvider = (user, { providerUserId, email }) => {
  user.authProviders = user.authProviders || [];

  const conflictingProvider = user.authProviders.find((authProvider) => {
    return authProvider.provider === 'apple' &&
      authProvider.providerUserId &&
      authProvider.providerUserId !== providerUserId;
  });

  if (conflictingProvider) {
    throw new AppError('This Apple ID is already linked to another NotWhat account', 409);
  }

  const existingProvider = user.authProviders.find((authProvider) => {
    return authProvider.provider === 'apple';
  });

  if (existingProvider) {
    existingProvider.providerUserId = providerUserId;
    existingProvider.email = email;
  } else {
    user.authProviders.push(nowProviderLink({
      provider: 'apple',
      providerUserId,
      email
    }));
  }

  user.appleId = providerUserId;
};

const linkGoogleProvider = (user, { providerUserId, email }) => {
  user.authProviders = user.authProviders || [];

  const conflictingProvider = user.authProviders.find((authProvider) => {
    return authProvider.provider === 'google' &&
      authProvider.providerUserId &&
      authProvider.providerUserId !== providerUserId;
  });

  if (conflictingProvider) {
    throw new AppError('This Google account is already linked to another NotWhat account', 409);
  }

  const existingProvider = user.authProviders.find((authProvider) => {
    return authProvider.provider === 'google';
  });

  if (existingProvider) {
    existingProvider.providerUserId = providerUserId;
    existingProvider.email = email;
  } else {
    user.authProviders.push(nowProviderLink({
      provider: 'google',
      providerUserId,
      email
    }));
  }

  user.googleId = providerUserId;
};

const createBuyerAccount = async ({ name, email, passwordHash, phone, address }, session) => {
  const normalizedEmail = normalizeEmail(email);

  const [user] = await User.create([{
    name,
    email: normalizedEmail,
    passwordHash,
    phone,
    role: 'buyer',
    address,
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
    signupProvider: 'password',
    authProviders: [nowProviderLink({
      provider: 'password',
      providerUserId: normalizedEmail,
      email: normalizedEmail
    })]
  }], { session });

  const [buyerProfile] = await BuyerProfile.create([{
    userId: user._id,
    savedProducts: [],
    savedStores: [],
    watchedReels: [],
    preferredRegions: [],
    preferredCategories: []
  }], { session });

  return createAuthPayload(user, { buyerProfile });
};

const signupBuyer = async () => {
  throw new AppError('Email verification is required before creating an account', 400);
};

const createSellerAccount = async ({
  name,
  email,
  passwordHash,
  phone,
  storeName,
  storeCategory,
  locality = '',
  city,
  state,
  pincode = '',
  country = 'India',
  specialtyRegion,
  storeDescription
}, session) => {
  const normalizedEmail = normalizeEmail(email);

  const [user] = await User.create([{
    name,
    email: normalizedEmail,
    passwordHash,
    phone,
    role: 'seller',
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
    signupProvider: 'password',
    authProviders: [nowProviderLink({
      provider: 'password',
      providerUserId: normalizedEmail,
      email: normalizedEmail
    })]
  }], { session });

  const [store] = await Store.create([{
    sellerId: user._id,
    storeName,
    category: storeCategory,
    locality,
    city,
    state,
    pincode,
    country,
    region: specialtyRegion,
    description: storeDescription,
    story: '',
    profileImageUrl: '',
    bannerImageUrl: '',
    verified: false,
    featuredCategories: [],
    viewCount: 0,
    savedBy: []
  }], { session });

  const [sellerProfile] = await SellerProfile.create([{
    userId: user._id,
    storeId: store._id,
    storeName,
    storeCategory,
    locality,
    city,
    state,
    pincode,
    country,
    specialtyRegion,
    storeDescription,
    pickupAddress: getDefaultPickupAddress(user._id)
  }], { session });

  return createAuthPayload(user, { sellerProfile, store });
};

const signupSeller = async () => {
  throw new AppError('Email verification is required before creating an account', 400);
};

const startPasswordSignup = async (role, payload) => {
  const normalizedEmail = normalizeEmail(payload.email);
  await ensureEmailAvailable(normalizedEmail);

  const now = new Date();
  let pendingSignup = await PendingSignup.findOne({
    email: normalizedEmail,
    role,
    consumedAt: null,
    expiresAt: { $gt: now }
  });

  if (pendingSignup?.resendAvailableAt && pendingSignup.resendAvailableAt > now) {
    throw new AppError('Please wait before requesting another verification code', 429);
  }

  if (pendingSignup && pendingSignup.sendCount >= env.signupOtpMaxSends) {
    throw new AppError('Too many verification codes requested. Please try again later.', 429);
  }

  const otp = generateSignupOtp();
  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
  const expiresAt = new Date(now.getTime() + env.signupOtpTtlMinutes * 60 * 1000);
  const resendAvailableAt = new Date(now.getTime() + env.signupOtpResendSeconds * 1000);
  const signupPayload = {
    ...payload,
    email: normalizedEmail,
    passwordHash
  };
  delete signupPayload.password;

  if (!pendingSignup) {
    pendingSignup = new PendingSignup({
      email: normalizedEmail,
      role,
      signupPayload,
      otpHash,
      attempts: 0,
      sendCount: 0,
      expiresAt,
      resendAvailableAt,
      lastSentAt: now
    });
  } else {
    pendingSignup.signupPayload = signupPayload;
    pendingSignup.otpHash = otpHash;
    pendingSignup.attempts = 0;
    pendingSignup.expiresAt = expiresAt;
    pendingSignup.resendAvailableAt = resendAvailableAt;
    pendingSignup.lastSentAt = now;
  }

  pendingSignup.sendCount += 1;
  await pendingSignup.save();

  if (!env.signupOtpTestCode) {
    await sendSignupOtpEmail({
      to: normalizedEmail,
      name: payload.name,
      otp,
      ttlMinutes: env.signupOtpTtlMinutes
    });
  }

  return publicPendingSignup(pendingSignup);
};

const startBuyerSignup = (payload) => startPasswordSignup('buyer', payload);

const startSellerSignup = (payload) => startPasswordSignup('seller', payload);

const resendSignupCode = async ({ verificationId }) => {
  const pendingSignup = await PendingSignup.findById(verificationId).select('+otpHash');
  const now = new Date();

  if (!pendingSignup || pendingSignup.consumedAt || pendingSignup.expiresAt <= now) {
    throw new AppError('Verification request expired. Please start signup again.', 400);
  }

  await ensureEmailAvailable(pendingSignup.email);

  if (pendingSignup.resendAvailableAt > now) {
    throw new AppError('Please wait before requesting another verification code', 429);
  }

  if (pendingSignup.sendCount >= env.signupOtpMaxSends) {
    throw new AppError('Too many verification codes requested. Please start signup again later.', 429);
  }

  const otp = generateSignupOtp();
  pendingSignup.otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  pendingSignup.attempts = 0;
  pendingSignup.sendCount += 1;
  pendingSignup.lastSentAt = now;
  pendingSignup.expiresAt = new Date(now.getTime() + env.signupOtpTtlMinutes * 60 * 1000);
  pendingSignup.resendAvailableAt = new Date(now.getTime() + env.signupOtpResendSeconds * 1000);
  await pendingSignup.save();

  if (!env.signupOtpTestCode) {
    await sendSignupOtpEmail({
      to: pendingSignup.email,
      name: pendingSignup.signupPayload?.name,
      otp,
      ttlMinutes: env.signupOtpTtlMinutes
    });
  }

  return publicPendingSignup(pendingSignup);
};

const verifySignupEmail = async ({ verificationId, otp }) => {
  const pendingSignup = await PendingSignup.findById(verificationId).select('+otpHash');
  const now = new Date();

  if (!pendingSignup || pendingSignup.consumedAt || pendingSignup.expiresAt <= now) {
    throw new AppError('Verification request expired. Please start signup again.', 400);
  }

  if (pendingSignup.attempts >= env.signupOtpMaxAttempts) {
    throw new AppError('Too many incorrect codes. Please request a new code.', 429);
  }

  const matches = await bcrypt.compare(otp, pendingSignup.otpHash);

  if (!matches) {
    pendingSignup.attempts += 1;
    await pendingSignup.save();
    throw new AppError('Invalid verification code', 400);
  }

  return runMaybeTransaction(async (session) => {
    await ensureEmailAvailable(pendingSignup.email, session);
    const authPayload = pendingSignup.role === 'buyer'
      ? await createBuyerAccount(pendingSignup.signupPayload, session)
      : await createSellerAccount(pendingSignup.signupPayload, session);

    pendingSignup.consumedAt = new Date();
    await pendingSignup.save({ session });
    return authPayload;
  });
};

const login = async ({ email, password, totpCode }) => {
  const normalizedEmail = normalizeEmail(email);
  const rawPassword = typeof password === 'string' ? password : '';
  const trimmedPassword = rawPassword.trim();
  const user = await User.findOne({
    email: normalizedEmail,
    accountStatus: { $nin: ['deleted', 'suspended', 'banned'] }
  }).select('+passwordHash +failedLoginAttempts +loginLockedUntil +adminTotpSecret');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
    throw new AppError('Too many failed login attempts. Try again after 15 minutes.', 429);
  }

  if (user.loginLockedUntil && user.loginLockedUntil <= new Date()) {
    user.failedLoginAttempts = 0;
    user.loginLockedUntil = null;
  }

  if (!user.passwordHash) {
    throw new AppError('Invalid email or password', 401);
  }

  let passwordMatches = await bcrypt.compare(rawPassword, user.passwordHash);

  // Mobile keyboards/autofill can accidentally append trailing spaces.
  // Retry with trimmed input before counting the attempt as failed.
  if (!passwordMatches && trimmedPassword !== rawPassword) {
    passwordMatches = await bcrypt.compare(trimmedPassword, user.passwordHash);
  }

  if (!passwordMatches) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      user.loginLockedUntil = new Date(Date.now() + LOGIN_LOCK_MS);
    }

    await user.save();
    throw new AppError('Invalid email or password', 401);
  }

  user.lastLoginAt = new Date();
  user.failedLoginAttempts = 0;
  user.loginLockedUntil = null;
  ensurePasswordProvider(user);

  if (user.role === 'admin') {
    if (!user.adminTotpEnabled || !user.adminTotpSecret) {
      throw new AppError('Admin two-factor authentication is not configured', 403);
    }

    if (!verifyTotpCode(user.adminTotpSecret, totpCode)) {
      throw new AppError('Invalid admin two-factor authentication code', 401);
    }
  }

  await user.save();

  return createAuthPayload(user);
};

const passwordResetResponse = (email, expiresAt) => ({
  email,
  expiresAt
});

const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MINUTES * 60 * 1000);
  const user = await User.findOne({
    email: normalizedEmail,
    accountStatus: { $nin: ['deleted', 'suspended', 'banned'] }
  });

  if (!user) {
    return passwordResetResponse(normalizedEmail, expiresAt);
  }

  const otp = generatePasswordResetOtp();

  await PasswordResetOtp.deleteMany({
    email: normalizedEmail,
    consumedAt: null
  });

  await PasswordResetOtp.create({
    email: normalizedEmail,
    userId: user._id,
    otpHash: await bcrypt.hash(otp, SALT_ROUNDS),
    expiresAt
  });

  if (!env.passwordResetOtpTestCode) {
    await sendPasswordResetOtpEmail({
      to: normalizedEmail,
      name: user.name,
      otp,
      ttlMinutes: PASSWORD_RESET_OTP_TTL_MINUTES
    });
  }

  return passwordResetResponse(normalizedEmail, expiresAt);
};

const verifyPasswordResetOtp = async ({ email, otp }) => {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();
  const resetOtp = await PasswordResetOtp.findOne({
    email: normalizedEmail,
    consumedAt: null,
    expiresAt: { $gt: now }
  })
    .sort({ createdAt: -1 })
    .select('+otpHash');

  if (!resetOtp) {
    throw new AppError('Invalid or expired reset code', 400);
  }

  if (resetOtp.attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
    throw new AppError('Too many incorrect reset code attempts. Request a new code.', 429);
  }

  const matches = await bcrypt.compare(otp, resetOtp.otpHash);

  if (!matches) {
    resetOtp.attempts += 1;
    await resetOtp.save();
    throw new AppError('Invalid or expired reset code', 400);
  }

  resetOtp.consumedAt = now;
  await resetOtp.save();

  const resetToken = generateToken({
    id: resetOtp.userId.toString(),
    email: normalizedEmail,
    purpose: 'password_reset'
  }, {
    expiresIn: PASSWORD_RESET_TOKEN_EXPIRES_IN
  });

  return {
    resetToken,
    expiresInSeconds: Math.floor(PASSWORD_RESET_TOKEN_EXPIRES_MS / 1000)
  };
};

const resetPassword = async ({ resetToken, newPassword }) => {
  const tokenHash = hashToken(resetToken);
  const alreadyUsed = await TokenBlacklist.exists({ tokenHash });

  if (alreadyUsed) {
    throw new AppError('Invalid or expired reset token', 401);
  }

  let decoded;

  try {
    decoded = jwt.verify(resetToken, env.jwtSecret);
  } catch (_error) {
    throw new AppError('Invalid or expired reset token', 401);
  }

  if (decoded.purpose !== 'password_reset' || !decoded.id) {
    throw new AppError('Invalid or expired reset token', 401);
  }

  const user = await User.findOne({
    _id: decoded.id,
    accountStatus: { $nin: ['deleted', 'suspended', 'banned'] }
  }).select('+passwordHash +failedLoginAttempts +loginLockedUntil');

  if (!user) {
    throw new AppError('Invalid or expired reset token', 401);
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.authInvalidatedAt = new Date();
  user.failedLoginAttempts = 0;
  user.loginLockedUntil = null;
  ensurePasswordProvider(user);
  await user.save();

  await Promise.all([
    PasswordResetOtp.updateMany(
      { userId: user._id, consumedAt: null },
      { $set: { consumedAt: new Date() } }
    ),
    TokenBlacklist.findOneAndUpdate(
      { tokenHash },
      {
        $setOnInsert: {
          tokenHash,
          userId: user._id,
          expiresAt: decoded.exp
            ? new Date(decoded.exp * 1000)
            : new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRES_MS),
          revokedAt: new Date()
        }
      },
      { upsert: true, new: true }
    )
  ]);

  return {
    passwordReset: true,
    sessionsInvalidated: true
  };
};

const changePassword = async ({ authUser, token, currentPassword, newPassword }) => {
  if (!token || !authUser?.id || !authUser?.exp) {
    throw new AppError('Authentication token required', 401);
  }

  const user = await User.findOne({
    _id: authUser.id,
    accountStatus: { $nin: ['deleted', 'suspended', 'banned'] }
  }).select('+passwordHash');

  if (!user) {
    throw new AppError('Authenticated user not found', 404);
  }

  if (!user.passwordHash) {
    throw new AppError('Your account uses Google sign-in. Password change is not available.', 400);
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!matches) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  ensurePasswordProvider(user);
  await user.save();

  const tokenHash = hashToken(token);
  await TokenBlacklist.findOneAndUpdate(
    { tokenHash },
    {
      $setOnInsert: {
        tokenHash,
        userId: user._id,
        expiresAt: new Date(authUser.exp * 1000),
        revokedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );

  return {
    passwordChanged: true
  };
};

const findAppleUser = async ({ providerUserId, email }, session) => {
  const byAppleId = await User.findOne({
    appleId: providerUserId,
    accountStatus: { $ne: 'deleted' }
  }).session(session || null);

  if (byAppleId) {
    return byAppleId;
  }

  if (!email) {
    return null;
  }

  return User.findOne({
    email,
    accountStatus: { $ne: 'deleted' }
  }).session(session || null);
};

const findGoogleUser = async ({ providerUserId, email }, session) => {
  const byGoogleId = await User.findOne({
    googleId: providerUserId,
    accountStatus: { $ne: 'deleted' }
  }).session(session || null);

  if (byGoogleId) {
    return byGoogleId;
  }

  return User.findOne({
    email,
    accountStatus: { $ne: 'deleted' }
  }).session(session || null);
};

const getSellerSetupState = async (userId, session) => {
  const [sellerProfile, store] = await Promise.all([
    SellerProfile.findOne({ userId }).session(session || null),
    Store.findOne({ sellerId: userId }).session(session || null)
  ]);

  return {
    sellerProfile,
    store,
    requiresSellerProfileSetup: !sellerProfile || !store
  };
};

const signInWithGoogle = async ({ idToken, role }) => {
  const normalizedRole = role ? role.trim().toLowerCase() : '';

  if (normalizedRole && !['buyer', 'seller'].includes(normalizedRole)) {
    throw new AppError('Role must be buyer or seller', 400);
  }

  const googleProfile = await googleAuthService.verifyIdToken(idToken);
  const normalizedEmail = normalizeEmail(googleProfile.email);

  return runMaybeTransaction(async (session) => {
    let user = await findGoogleUser({
      providerUserId: googleProfile.providerUserId,
      email: normalizedEmail
    }, session);
    const isNewUser = !user;

    if (user && user.googleId && user.googleId !== googleProfile.providerUserId) {
      throw new AppError('This email is already linked to another Google account', 409);
    }

    if (user && ['suspended', 'banned'].includes(user.accountStatus)) {
      throw new AppError('This account is suspended. Please contact support.', 403);
    }

    if (user) {
      linkGoogleProvider(user, {
        providerUserId: googleProfile.providerUserId,
        email: normalizedEmail
      });
      user.isEmailVerified = true;
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      user.avatarUrl = user.avatarUrl || googleProfile.picture;
      user.lastLoginAt = new Date();
      await user.save({ session });

      const sellerSetup = user.role === 'seller'
        ? await getSellerSetupState(user._id, session)
        : { sellerProfile: null, store: null, requiresSellerProfileSetup: false };

      return createAuthPayload(user, {
        isNewUser,
        requiresRoleSelection: false,
        requiresSellerProfileSetup: sellerSetup.requiresSellerProfileSetup,
        sellerProfile: sellerSetup.sellerProfile,
        store: sellerSetup.store
      });
    }

    if (!normalizedRole) {
      return {
        token: null,
        user: null,
        isNewUser: true,
        requiresRoleSelection: true,
        requiresSellerProfileSetup: false
      };
    }

    const accountStatus = normalizedRole === 'seller' ? 'pending_profile' : 'active';
    const [createdUser] = await User.create([{
      name: googleProfile.name,
      email: normalizedEmail,
      googleId: googleProfile.providerUserId,
      avatarUrl: googleProfile.picture,
      role: normalizedRole,
      accountStatus,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      signupProvider: 'google',
      lastLoginAt: new Date(),
      authProviders: [nowProviderLink({
        provider: 'google',
        providerUserId: googleProfile.providerUserId,
        email: normalizedEmail
      })]
    }], { session });

    if (normalizedRole === 'buyer') {
      const [buyerProfile] = await BuyerProfile.create([{
        userId: createdUser._id,
        savedProducts: [],
        savedStores: [],
        watchedReels: [],
        preferredRegions: [],
        preferredCategories: []
      }], { session });

      return createAuthPayload(createdUser, {
        buyerProfile,
        isNewUser,
        requiresRoleSelection: false,
        requiresSellerProfileSetup: false
      });
    }

    return createAuthPayload(createdUser, {
      isNewUser,
      requiresRoleSelection: false,
      requiresSellerProfileSetup: true,
      sellerProfile: null,
      store: null
    });
  });
};

const signInWithApple = async ({ identityToken, fullName, role }) => {
  const normalizedRole = role ? role.trim().toLowerCase() : '';

  if (normalizedRole && !['buyer', 'seller'].includes(normalizedRole)) {
    throw new AppError('Role must be buyer or seller', 400);
  }

  const appleProfile = await appleAuthService.verifyIdentityToken(identityToken);
  const normalizedEmail = appleProfile.email ? normalizeEmail(appleProfile.email) : '';

  return runMaybeTransaction(async (session) => {
    let user = await findAppleUser({
      providerUserId: appleProfile.providerUserId,
      email: normalizedEmail
    }, session);
    const isNewUser = !user;

    if (user && user.appleId && user.appleId !== appleProfile.providerUserId) {
      throw new AppError('This email is already linked to another Apple ID', 409);
    }

    if (user && ['suspended', 'banned'].includes(user.accountStatus)) {
      throw new AppError('This account is suspended. Please contact support.', 403);
    }

    if (user) {
      linkAppleProvider(user, {
        providerUserId: appleProfile.providerUserId,
        email: normalizedEmail || user.email
      });
      user.isEmailVerified = true;
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      user.lastLoginAt = new Date();
      await user.save({ session });

      const sellerSetup = user.role === 'seller'
        ? await getSellerSetupState(user._id, session)
        : { sellerProfile: null, store: null, requiresSellerProfileSetup: false };

      return createAuthPayload(user, {
        isNewUser,
        requiresRoleSelection: false,
        requiresSellerProfileSetup: sellerSetup.requiresSellerProfileSetup,
        sellerProfile: sellerSetup.sellerProfile,
        store: sellerSetup.store
      });
    }

    if (!normalizedEmail) {
      throw new AppError('We could not read the email for your Apple ID. Please try again.', 400);
    }

    if (!normalizedRole) {
      return {
        token: null,
        user: null,
        isNewUser: true,
        requiresRoleSelection: true,
        requiresSellerProfileSetup: false
      };
    }

    const trimmedFullName = (fullName || '').trim();
    const accountStatus = normalizedRole === 'seller' ? 'pending_profile' : 'active';
    const [createdUser] = await User.create([{
      name: trimmedFullName || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      appleId: appleProfile.providerUserId,
      role: normalizedRole,
      accountStatus,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      signupProvider: 'apple',
      lastLoginAt: new Date(),
      authProviders: [nowProviderLink({
        provider: 'apple',
        providerUserId: appleProfile.providerUserId,
        email: normalizedEmail
      })]
    }], { session });

    if (normalizedRole === 'buyer') {
      const [buyerProfile] = await BuyerProfile.create([{
        userId: createdUser._id,
        savedProducts: [],
        savedStores: [],
        watchedReels: [],
        preferredRegions: [],
        preferredCategories: []
      }], { session });

      return createAuthPayload(createdUser, {
        buyerProfile,
        isNewUser,
        requiresRoleSelection: false,
        requiresSellerProfileSetup: false
      });
    }

    return createAuthPayload(createdUser, {
      isNewUser,
      requiresRoleSelection: false,
      requiresSellerProfileSetup: true,
      sellerProfile: null,
      store: null
    });
  });
};

const logout = async ({ token, user }) => {
  if (!token || !user?.id || !user?.exp) {
    throw new AppError('Authentication token required', 401);
  }

  const expiresAt = new Date(user.exp * 1000);

  await TokenBlacklist.findOneAndUpdate(
    { tokenHash: hashToken(token) },
    {
      $setOnInsert: {
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt,
        revokedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );

  return {
    message: 'Logged out successfully. Token has been revoked.'
  };
};

const getCurrentUser = async (authUser) => {
  const user = await User.findById(authUser.id);

  if (!user || ['deleted', 'suspended', 'banned'].includes(user.accountStatus)) {
    throw new AppError('Authenticated user not found', 404);
  }

  const payload = {
    user: serializeUser(user)
  };

  if (user.role === 'buyer') {
    payload.buyerProfile = await BuyerProfile.findOne({ userId: user._id });
  }

  if (user.role === 'seller') {
    payload.sellerProfile = await SellerProfile.findOne({ userId: user._id });
    payload.store = payload.sellerProfile
      ? await Store.findById(payload.sellerProfile.storeId)
      : null;
  }

  return payload;
};

const applySession = (query, session) => {
  return session ? query.session(session) : query;
};

const anonymizedEmailFor = (userId) => `deleted-${userId.toString()}@deleted.notwhat.local`;

const scrubBuyerData = async (userId, session) => {
  await Promise.all([
    applySession(BuyerProfile.updateOne(
      { userId },
      {
        $set: {
          savedProducts: [],
          savedStores: [],
          watchedReels: [],
          preferredRegions: [],
          preferredCategories: []
        }
      }
    ), session),
    applySession(Cart.deleteOne({ buyerId: userId }), session),
    applySession(Like.deleteMany({ userId }), session),
    applySession(Comment.updateMany({ userId }, { $set: { text: '[deleted]' } }), session),
    applySession(Store.updateMany({ savedBy: userId }, { $pull: { savedBy: userId } }), session),
    applySession(AnalyticsEvent.updateMany({ userId }, { $set: { userId: null } }), session)
  ]);
};

const scrubSellerData = async (userId, session) => {
  const sellerProfile = await applySession(
    SellerProfile.findOne({ userId }),
    session
  );
  const storeId = sellerProfile ? sellerProfile.storeId : null;

  await Promise.all([
    applySession(SellerProfile.updateOne(
      { userId },
      {
        $set: {
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
        }
      }
    ), session),
    applySession(Store.updateOne(
      { sellerId: userId },
      {
        $set: {
          storeName: 'Deleted seller store',
          description: 'This seller account has been deleted.',
          story: '',
          profileImageUrl: '',
          bannerImageUrl: '',
          verified: false,
          featuredCategories: []
        },
        $pull: { savedBy: userId }
      }
    ), session),
    applySession(Store.updateMany({ savedBy: userId }, { $pull: { savedBy: userId } }), session),
    applySession(Product.updateMany({ sellerId: userId }, { $set: { status: 'inactive', featured: false } }), session),
    applySession(Reel.updateMany({ sellerId: userId }, { $set: { status: 'hidden' } }), session),
    applySession(AnalyticsEvent.updateMany({ userId }, { $set: { userId: null } }), session)
  ]);

  return {
    storeId,
    productsDeactivated: true,
    reelsHidden: true
  };
};

const deleteAccount = async (authUser) => {
  return runMaybeTransaction(async (session) => {
    const user = await applySession(
      User.findById(authUser.id).select('+passwordHash'),
      session
    );

    if (!user || user.accountStatus === 'deleted') {
      throw new AppError('Authenticated user not found', 404);
    }

    const deletedAt = new Date();
    let roleCleanup = {};

    if (user.role === 'buyer') {
      await scrubBuyerData(user._id, session);
      roleCleanup = {
        buyerProfileScrubbed: true,
        cartRemoved: true
      };
    }

    if (user.role === 'seller') {
      roleCleanup = await scrubSellerData(user._id, session);
    }

    user.name = 'Deleted NotWhat User';
    user.email = anonymizedEmailFor(user._id);
    user.phone = '';
    user.address = '';
    user.passwordHash = await bcrypt.hash(`${user._id}:${deletedAt.toISOString()}:${env.jwtSecret}`, SALT_ROUNDS);
    user.accountStatus = 'deleted';
    user.authInvalidatedAt = deletedAt;
    user.deletedAt = deletedAt;

    await user.save({ session });

    return {
      message: 'Account deleted successfully. Please discard the current token on the client.',
      accountDeleted: true,
      role: user.role,
      deletedAt,
      authRevoked: true,
      dependencies: {
        ordersRetainedForLegalAndSupport: true,
        ...roleCleanup
      }
    };
  });
};

const updateProfile = async (authUser, body) => {
  const user = await User.findById(authUser.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (body.name !== undefined && body.name.trim()) {
    user.name = body.name.trim();
  }

  if (body.phone !== undefined) {
    user.phone = body.phone.trim();
  }

  if (body.address !== undefined) {
    user.address = body.address.trim();
  }

  await user.save();

  return { user: serializeUser(user) };
};

const completeGoogleSellerProfile = async (authUser, {
  storeName,
  storeCategory,
  locality = '',
  city,
  state,
  pincode = '',
  country = 'India',
  specialtyRegion,
  storeDescription,
  phone
}) => {
  return runMaybeTransaction(async (session) => {
    const user = await User.findById(authUser.id).session(session || null);

    if (!user || ['deleted', 'suspended', 'banned'].includes(user.accountStatus)) {
      throw new AppError('Authenticated user not found', 404);
    }

    if (user.role !== 'seller') {
      throw new AppError('Only sellers can complete seller profile setup', 403);
    }

    const existingProfile = await SellerProfile.findOne({ userId: user._id }).session(session || null);
    const existingStore = await Store.findOne({ sellerId: user._id }).session(session || null);

    if (existingProfile && existingStore) {
      user.accountStatus = 'active';
      if (phone && !user.phone) {
        user.phone = phone;
      }
      await user.save({ session });
      return createAuthPayload(user, {
        sellerProfile: existingProfile,
        store: existingStore,
        isNewUser: false,
        requiresRoleSelection: false,
        requiresSellerProfileSetup: false
      });
    }

    if (existingProfile || existingStore) {
      throw new AppError('Seller profile setup is partially complete. Please contact support.', 409);
    }

    const [store] = await Store.create([{
      sellerId: user._id,
      storeName,
      category: storeCategory,
      locality,
      city,
      state,
      pincode,
      country,
      region: specialtyRegion,
      description: storeDescription,
      story: '',
      profileImageUrl: user.avatarUrl || '',
      bannerImageUrl: '',
      verified: false,
      featuredCategories: [],
      viewCount: 0,
      savedBy: []
    }], { session });

    const [sellerProfile] = await SellerProfile.create([{
      userId: user._id,
      storeId: store._id,
      storeName,
      storeCategory,
      locality,
      city,
      state,
      pincode,
      country,
      specialtyRegion,
      storeDescription,
      pickupAddress: getDefaultPickupAddress(user._id)
    }], { session });

    if (phone) {
      user.phone = phone;
    }
    user.accountStatus = 'active';
    await user.save({ session });

    return createAuthPayload(user, {
      sellerProfile,
      store,
      isNewUser: false,
      requiresRoleSelection: false,
      requiresSellerProfileSetup: false
    });
  });
};

module.exports = {
  signupBuyer,
  signupSeller,
  startBuyerSignup,
  startSellerSignup,
  resendSignupCode,
  verifySignupEmail,
  signInWithGoogle,
  signInWithApple,
  login,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
  changePassword,
  logout,
  getCurrentUser,
  deleteAccount,
  updateProfile,
  completeGoogleSellerProfile
};
