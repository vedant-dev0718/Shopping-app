const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const adminDashboardService = require('./adminDashboard.service');

const summary = asyncHandler(async (_req, res) => {
  const data = await adminDashboardService.getSummary();

  return successResponse(res, {
    message: 'Admin dashboard summary fetched',
    data
  });
});

module.exports = {
  summary
};
