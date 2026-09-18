const crypto = require('crypto');

const axios = require('axios');
const jwt = require('jsonwebtoken');

const AppError = require('../utils/AppError');
const env = require('../config/env');

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

let jwksCache = {
  keys: [],
  fetchedAt: 0
};

const findCachedKey = (kid) => jwksCache.keys.find((key) => key.kid === kid);

const getAppleSigningKeyPem = async (kid) => {
  const isCacheFresh = Date.now() - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS;
  let jwk = isCacheFresh ? findCachedKey(kid) : null;

  if (!jwk) {
    const { data } = await axios.get(APPLE_JWKS_URL, { timeout: 10000 });
    jwksCache = {
      keys: Array.isArray(data.keys) ? data.keys : [],
      fetchedAt: Date.now()
    };
    jwk = findCachedKey(kid);
  }

  if (!jwk) {
    throw new AppError('We could not verify your Apple account. Please try again.', 401);
  }

  return crypto.createPublicKey({ key: jwk, format: 'jwk' })
    .export({ type: 'spki', format: 'pem' });
};

const verifyIdentityToken = async (identityToken) => {
  const audience = [env.appleBundleId].filter(Boolean);

  if (audience.length === 0) {
    throw new AppError('Apple authentication is not configured', 500);
  }

  try {
    const decoded = jwt.decode(identityToken, { complete: true });

    if (!decoded || !decoded.header || !decoded.header.kid) {
      throw new AppError('We could not verify your Apple account. Please try again.', 401);
    }

    const signingKey = await getAppleSigningKeyPem(decoded.header.kid);
    const payload = jwt.verify(identityToken, signingKey, {
      algorithms: ['RS256'],
      issuer: APPLE_ISSUER,
      audience
    });

    if (!payload || !payload.sub) {
      throw new AppError('We could not verify your Apple account. Please try again.', 401);
    }

    return {
      providerUserId: payload.sub,
      email: payload.email || '',
      emailVerified: payload.email_verified === true || payload.email_verified === 'true'
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('We could not verify your Apple account. Please try again.', 401);
  }
};

module.exports = {
  verifyIdentityToken
};
