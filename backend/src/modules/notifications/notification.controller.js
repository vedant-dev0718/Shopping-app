const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const notificationService = require('./notification.service');

const registerDeviceToken = asyncHandler(async (req, res) => {
  const token = await notificationService.registerDeviceToken(req.user.id, req.user.role, req.body);
  return successResponse(res, { statusCode: 201, message: 'Device token registered successfully', data: token });
});

const removeDeviceToken = asyncHandler(async (req, res) => {
  const result = await notificationService.removeDeviceToken(req.user.id, req.query.fcmToken);
  return successResponse(res, { message: 'Device token removed successfully', data: result });
});

module.exports = {
  registerDeviceToken,
  removeDeviceToken
};
