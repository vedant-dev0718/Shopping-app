const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const contentService = require('./content.service');

const getContentPage = (slug) => asyncHandler(async (_req, res) => {
  const page = await contentService.getContentPage(slug);

  return successResponse(res, {
    data: page
  });
});

module.exports = {
  getContentPage
};
