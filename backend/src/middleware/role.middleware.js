const AppError = require('../utils/AppError');

const authorizeRoles = (...allowedRoles) => (req, _res, next) => {
  const userRole = req.user && req.user.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    return next(new AppError('You do not have permission to access this resource', 403));
  }

  return next();
};

const requireBuyer = authorizeRoles('buyer');
const requireSeller = authorizeRoles('seller');
const requireAdmin = authorizeRoles('admin');

module.exports = {
  authorizeRoles,
  requireBuyer,
  requireSeller,
  requireAdmin
};
