const mongoose = require('mongoose');

const DeviceToken = require('../../src/modules/notifications/deviceToken.model');
const notificationService = require('../../src/modules/notifications/notification.service');

describe('notification.service', () => {
  const userId = new mongoose.Types.ObjectId();

  test('registerDeviceToken upserts a device token for the user', async () => {
    const token = await notificationService.registerDeviceToken(userId, 'buyer', {
      fcmToken: 'token-abc',
      platform: 'ios',
      appVersion: '1.0.0'
    });

    expect(token.userId.toString()).toBe(userId.toString());
    expect(token.role).toBe('buyer');
    expect(token.platform).toBe('ios');

    const stored = await DeviceToken.find({ userId });
    expect(stored).toHaveLength(1);
  });

  test('registerDeviceToken re-registering the same token does not create duplicates', async () => {
    await notificationService.registerDeviceToken(userId, 'buyer', { fcmToken: 'token-abc', platform: 'ios' });
    await notificationService.registerDeviceToken(userId, 'buyer', { fcmToken: 'token-abc', platform: 'ios' });

    const stored = await DeviceToken.find({ userId });
    expect(stored).toHaveLength(1);
  });

  test('sendToUsers is a no-op when the user has no registered device tokens', async () => {
    const result = await notificationService.sendToUsers([userId], { title: 'Hello', subtitle: 'World' });

    expect(result.successCount).toBe(0);
  });

  test('sendToUser delivers to every registered token for that user', async () => {
    await notificationService.registerDeviceToken(userId, 'seller', { fcmToken: 'token-1', platform: 'ios' });
    await notificationService.registerDeviceToken(userId, 'seller', { fcmToken: 'token-2', platform: 'android' });

    const result = await notificationService.sendToUser(userId, {
      title: 'New order received',
      subtitle: 'Order #1001 from a buyer',
      data: { orderId: '1001' }
    });

    expect(result.successCount).toBe(2);
  });

  test('removeDeviceToken deletes only the matching token', async () => {
    await notificationService.registerDeviceToken(userId, 'buyer', { fcmToken: 'token-keep', platform: 'ios' });
    await notificationService.registerDeviceToken(userId, 'buyer', { fcmToken: 'token-remove', platform: 'ios' });

    await notificationService.removeDeviceToken(userId, 'token-remove');

    const stored = await DeviceToken.find({ userId }).select('fcmToken').lean();
    expect(stored.map((entry) => entry.fcmToken)).toEqual(['token-keep']);
  });
});
