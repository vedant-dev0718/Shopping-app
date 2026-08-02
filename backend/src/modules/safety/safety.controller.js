const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const safetyService = require('./safety.service');

const createReport = asyncHandler(async (req, res) => {
  const data = await safetyService.createReport(req.user, req.body);

  return successResponse(res, {
    statusCode: 201,
    message: 'Report submitted successfully. We will review it shortly.',
    data
  });
});

const blockUser = asyncHandler(async (req, res) => {
  const data = await safetyService.blockUser(req.user, req.params.userId);

  return successResponse(res, {
    message: 'User blocked successfully',
    data
  });
});

const unblockUser = asyncHandler(async (req, res) => {
  const data = await safetyService.unblockUser(req.user, req.params.userId);

  return successResponse(res, {
    message: 'User unblocked successfully',
    data
  });
});

const listBlockedUsers = asyncHandler(async (req, res) => {
  const data = await safetyService.getBlockedUsers(req.user);

  return successResponse(res, {
    message: 'Blocked users fetched successfully',
    data
  });
});

const listReports = asyncHandler(async (req, res) => {
  const data = await safetyService.listReports(req.query);

  return successResponse(res, {
    message: 'Moderation reports fetched successfully',
    data
  });
});

const resolveReport = asyncHandler(async (req, res) => {
  const data = await safetyService.resolveReport(req.user, req.params.id, req.body);

  return successResponse(res, {
    message: 'Moderation report resolved successfully',
    data
  });
});

module.exports = {
  createReport,
  blockUser,
  unblockUser,
  listBlockedUsers,
  listReports,
  resolveReport
};
