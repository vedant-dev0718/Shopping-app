const asyncHandler = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/apiResponse');
const authService = require('./auth.service');

const signupBuyer = asyncHandler(async (req, res) => {
  const data = await authService.signupBuyer(req.body);

  return successResponse(res, {
    statusCode: 201,
    message: 'Buyer account created successfully',
    data
  });
});

const signupSeller = asyncHandler(async (req, res) => {
  const data = await authService.signupSeller(req.body);

  return successResponse(res, {
    statusCode: 201,
    message: 'Seller account created successfully',
    data
  });
});

const startBuyerSignup = asyncHandler(async (req, res) => {
  const data = await authService.startBuyerSignup(req.body);

  return successResponse(res, {
    message: 'Verification code sent successfully',
    data
  });
});

const startSellerSignup = asyncHandler(async (req, res) => {
  const data = await authService.startSellerSignup(req.body);

  return successResponse(res, {
    message: 'Verification code sent successfully',
    data
  });
});

const resendSignupCode = asyncHandler(async (req, res) => {
  const data = await authService.resendSignupCode(req.body);

  return successResponse(res, {
    message: 'Verification code resent successfully',
    data
  });
});

const verifySignupEmail = asyncHandler(async (req, res) => {
  const data = await authService.verifySignupEmail(req.body);

  return successResponse(res, {
    statusCode: 201,
    message: 'Email verified and account created successfully',
    data
  });
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);

  return successResponse(res, {
    message: 'Logged in successfully',
    data
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const data = await authService.requestPasswordReset(req.body);

  return successResponse(res, {
    message: 'If an account exists for this email, a reset code has been sent.',
    data
  });
});

const verifyResetOtp = asyncHandler(async (req, res) => {
  const data = await authService.verifyPasswordResetOtp(req.body);

  return successResponse(res, {
    message: 'Reset code verified successfully',
    data
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(req.body);

  return successResponse(res, {
    message: 'Password reset successfully',
    data
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const data = await authService.changePassword({
    authUser: req.user,
    token: req.authToken,
    ...req.body
  });

  return successResponse(res, {
    message: 'Password changed successfully',
    data
  });
});

const google = asyncHandler(async (req, res) => {
  const data = await authService.signInWithGoogle(req.body);

  return successResponse(res, {
    statusCode: data.isNewUser && !data.requiresRoleSelection ? 201 : 200,
    message: data.requiresRoleSelection
      ? 'Please choose how you want to use NotWhat.'
      : 'Google sign-in completed successfully',
    data
  });
});

const apple = asyncHandler(async (req, res) => {
  const data = await authService.signInWithApple(req.body);

  return successResponse(res, {
    statusCode: data.isNewUser && !data.requiresRoleSelection ? 201 : 200,
    message: data.requiresRoleSelection
      ? 'Please choose how you want to use NotWhat.'
      : 'Apple sign-in completed successfully',
    data
  });
});

const logout = asyncHandler(async (req, res) => {
  const data = await authService.logout({
    token: req.authToken,
    user: req.user
  });

  return successResponse(res, {
    message: data.message,
    data: null
  });
});

const me = asyncHandler(async (req, res) => {
  const data = await authService.getCurrentUser(req.user);

  return successResponse(res, {
    message: 'Authenticated user profile fetched successfully',
    data
  });
});

const deleteAccount = asyncHandler(async (req, res) => {
  const data = await authService.deleteAccount(req.user);

  return successResponse(res, {
    message: data.message,
    data
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const data = await authService.updateProfile(req.user, req.body);

  return successResponse(res, {
    message: 'Profile updated successfully',
    data
  });
});

const completeGoogleProfile = asyncHandler(async (req, res) => {
  const data = await authService.completeGoogleSellerProfile(req.user, req.body);

  return successResponse(res, {
    message: 'Seller profile setup completed successfully',
    data
  });
});

module.exports = {
  signupBuyer,
  signupSeller,
  startBuyerSignup,
  startSellerSignup,
  resendSignupCode,
  verifySignupEmail,
  google,
  apple,
  login,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword,
  logout,
  me,
  deleteAccount,
  updateProfile,
  completeGoogleProfile
};
