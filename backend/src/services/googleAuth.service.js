const { OAuth2Client } = require('google-auth-library');

const AppError = require('../utils/AppError');
const env = require('../config/env');

const getAllowedAudiences = () => {
  return [env.googleWebClientId, env.googleIosClientId].filter(Boolean);
};

const verifyIdToken = async (idToken) => {
  const audience = getAllowedAudiences();

  if (audience.length === 0) {
    throw new AppError('Google authentication is not configured', 500);
  }

  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.sub) {
      throw new AppError('We could not verify your Google account. Please try again.', 401);
    }

    if (!payload.email) {
      throw new AppError('Google account email is required', 400);
    }

    if (payload.email_verified !== true) {
      throw new AppError('Google account email is not verified', 401);
    }

    return {
      providerUserId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture || ''
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('We could not verify your Google account. Please try again.', 401);
  }
};

module.exports = {
  verifyIdToken
};
