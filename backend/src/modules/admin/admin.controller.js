const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const adminService = require('./admin.service');

const login = asyncHandler(async (req, res) => {
  const data = await adminService.loginAdmin(req.body);

  return successResponse(res, {
    message: 'Admin logged in successfully',
    data
  });
});

const me = asyncHandler(async (req, res) => {
  const data = await adminService.getAdminProfile(req.user);

  return successResponse(res, {
    message: 'Admin profile fetched successfully',
    data
  });
});

module.exports = {
  login,
  me
};
