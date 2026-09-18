const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const adminSearchService = require('./adminSearch.service');

const search = asyncHandler(async (req, res) => {
  const data = await adminSearchService.search(req.query);

  return successResponse(res, {
    message: 'Admin search completed',
    data
  });
});

module.exports = {
  search
};
