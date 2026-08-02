const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const catalogueReadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }

    return `anon:${ipKeyGenerator(req.ip)}`;
  },
  message: {
    success: false,
    message: 'Too many catalogue/search requests. Please wait before trying again.'
  }
});

module.exports = {
  catalogueReadLimiter
};
