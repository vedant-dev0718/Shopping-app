const AppError = require('../../utils/AppError');
const { authenticate } = require('../../middleware/auth.middleware');

const requireAuth = authenticate;

const requireAdmin = (req, _res, next) => {
  const role = req.user && req.user.role;

  if (role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  return next();
};

module.exports = {
  requireAuth,
  requireAdmin
};
