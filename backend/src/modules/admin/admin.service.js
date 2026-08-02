const authService = require('../auth/auth.service');
const AppError = require('../../utils/AppError');

const loginAdmin = async ({ email, password, totpCode }) => {
  const auth = await authService.login({ email, password, totpCode });

  if (auth.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  return auth;
};

const getAdminProfile = async (authUser) => authService.getCurrentUser(authUser);

module.exports = {
  loginAdmin,
  getAdminProfile
};
