const { api } = require('../helpers/testServer.helper');
const { authHeader, createAdmin, createBuyer, createSeller } = require('../helpers/auth.helper');

describe('security: auth roles', () => {
  test('protected routes require authentication and correct role', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const admin = await createAdmin();

    await api().get('/api/cart').expect(401);
    await api().get('/api/cart').set('Authorization', authHeader(seller)).expect(403);
    await api().get('/api/seller/orders').set('Authorization', authHeader(buyer)).expect(403);
    await api().get('/api/admin/moderation/reports').set('Authorization', authHeader(seller)).expect(403);
    await api().get('/api/admin/moderation/reports').set('Authorization', authHeader(admin)).expect(200);
  });
});
