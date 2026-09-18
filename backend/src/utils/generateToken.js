const jwt = require('jsonwebtoken');

const env = require('../config/env');

const generateToken = (payload, options = {}) => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    ...options
  });
};

module.exports = generateToken;
