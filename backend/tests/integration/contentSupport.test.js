const SupportRequest = require('../../src/modules/contact/supportRequest.model');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer } = require('../helpers/auth.helper');

describe('content, legal, and support API', () => {
  test('legal and policy pages return content', async () => {
    const pages = ['privacy-policy', 'terms-of-service', 'return-policy', 'shipping-policy', 'about'];

    for (const page of pages) {
      const response = await api().get(`/api/content/${page}`).expect(200);
      expect(response.body.data.title).toBeTruthy();
      expect(Array.isArray(response.body.data.sections)).toBe(true);
    }
  });

  test('support request validates email/message and attaches logged-in user', async () => {
    const buyer = await createBuyer();

    await api().post('/api/contact/support').send({
      name: 'QA',
      email: 'bad-email',
      subject: 'Help',
      message: 'Need help'
    }).expect(400);

    await api().post('/api/contact/support').send({
      name: 'QA',
      email: 'qa@example.com',
      subject: 'Help',
      message: ''
    }).expect(400);

    await api()
      .post('/api/contact/support')
      .set('Authorization', authHeader(buyer))
      .send({
        name: 'QA Buyer',
        email: 'qa-buyer@example.com',
        subject: 'Support request',
        message: 'Please help with my order',
        orderNumber: 'NW-QA-123'
      })
      .expect(201);

    const saved = await SupportRequest.findOne({ email: 'qa-buyer@example.com' }).lean();
    expect(saved.userId.toString()).toBe(buyer._id.toString());
  });
});
