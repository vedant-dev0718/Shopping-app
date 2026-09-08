const DeviceToken = require('./deviceToken.model');
const { sendMulticast } = require('../../utils/pushNotification');

const registerDeviceToken = async (userId, role, { fcmToken, platform, appVersion }) => DeviceToken.findOneAndUpdate(
  { userId, fcmToken },
  { userId, role, platform, fcmToken, appVersion: appVersion || '', lastSeenAt: new Date() },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

const removeDeviceToken = async (userId, fcmToken) => {
  await DeviceToken.deleteOne({ userId, fcmToken });
  return { removed: true };
};

// FCM data payloads must be flat string maps.
const stringifyData = (data = {}) => Object.fromEntries(
  Object.entries(data).map(([key, value]) => [key, value === undefined || value === null ? '' : String(value)])
);

const sendToUsers = async (userIds = [], { title, subtitle = '', data } = {}) => {
  if (!title || userIds.length === 0) {
    return { successCount: 0 };
  }

  const deviceTokens = await DeviceToken.find({ userId: { $in: userIds } }).select('fcmToken').lean();
  const tokens = deviceTokens.map((entry) => entry.fcmToken);

  if (tokens.length === 0) {
    return { successCount: 0 };
  }

  try {
    const { successCount, invalidTokens } = await sendMulticast(tokens, {
      title,
      subtitle,
      data: stringifyData(data)
    });

    if (invalidTokens.length > 0) {
      await DeviceToken.deleteMany({ fcmToken: { $in: invalidTokens } });
    }

    return { successCount };
  } catch (error) {
    console.error('[notifications] Failed to send push notification:', error.message);
    return { successCount: 0 };
  }
};

const sendToUser = async (userId, payload) => sendToUsers([userId], payload);

module.exports = {
  registerDeviceToken,
  removeDeviceToken,
  sendToUser,
  sendToUsers
};
