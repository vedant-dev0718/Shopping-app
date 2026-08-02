const jwt = require('jsonwebtoken');

const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const hashToken = require('../utils/hashToken');
const TokenBlacklist = require('../modules/auth/tokenBlacklist.model');
const User = require('../modules/users/user.model');

const verifyToken = async (token) => {
  let decoded;

  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (_error) {
    throw new AppError('Invalid or expired authentication token', 401);
  }

  const blacklisted = await TokenBlacklist.exists({ tokenHash: hashToken(token) });

  if (blacklisted) {
    throw new AppError('Invalid or expired authentication token', 401);
  }

  const user = await User.findById(decoded.id).select('accountStatus authInvalidatedAt');

  if (!user || ['deleted', 'suspended', 'banned'].includes(user.accountStatus)) {
    throw new AppError('Invalid or expired authentication token', 401);
  }

  if (user.authInvalidatedAt && decoded.iat) {
    const issuedAt = decoded.iat * 1000;

    if (issuedAt <= user.authInvalidatedAt.getTime()) {
      throw new AppError('Invalid or expired authentication token', 401);
    }
  }

  return decoded;
};

const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication token required', 401);
  }

  const token = authHeader.split(' ')[1];

  req.user = await verifyToken(token);
  req.authToken = token;
  next();
});

const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  req.user = await verifyToken(token);
  req.authToken = token;
  return next();
});

module.exports = {
  authenticate,
  optionalAuthenticate
};
