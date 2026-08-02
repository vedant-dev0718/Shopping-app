const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const contactService = require('./contact.service');

const submitSupportRequest = asyncHandler(async (req, res) => {
  const supportRequest = await contactService.submitSupportRequest(req.user || null, req.body);

  return successResponse(res, {
    statusCode: 201,
    message: 'Support request submitted successfully.',
    data: supportRequest
  });
});

module.exports = {
  submitSupportRequest
};
