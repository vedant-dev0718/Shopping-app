const AdminActionLog = require('../../src/modules/adminManagement/adminActionLog.model');
const AppSetting = require('../../src/modules/adminTools/appSetting.model');
const Category = require('../../src/modules/adminTools/category.model');
const Region = require('../../src/modules/adminTools/region.model');
const ContentPage = require('../../src/modules/content/contentPage.model');
const SupportRequest = require('../../src/modules/contact/supportRequest.model');
const Product = require('../../src/modules/products/product.model');
const Report = require('../../src/modules/safety/report.model');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createAdmin, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');

describe('admin trust, support, content, settings, and featured tools', () => {
  test('admin reviews report detail, resolves unsafe content, and logs action', async () => {
    const admin = await createAdmin();
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { title: 'Unsafe Admin Tool Product' });

    await api()
      .post('/api/safety/reports')
      .set('Authorization', authHeader(buyer))
      .send({ targetType: 'product', targetId: product._id, reason: 'counterfeit', details: 'Looks unsafe' })
      .expect(201);

    const report = await Report.findOne({ targetId: product._id });

    await api()
      .get(`/api/admin/moderation/reports/${report._id}`)
      .set('Authorization', authHeader(buyer))
      .expect(403);

    await api()
      .get(`/api/admin/moderation/reports/${report._id}`)
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.reportId).toBe(report._id.toString());
        expect(res.body.data.targetContentPreview.title).toBe('Unsafe Admin Tool Product');
        expect(res.body.data.previousReportsAgainstSameTarget).toEqual([]);
      });

    await api()
      .patch(`/api/admin/moderation/reports/${report._id}/resolve`)
      .set('Authorization', authHeader(admin))
      .send({ action: 'content_hidden', note: 'Counterfeit test hide' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.status).toBe('resolved');
      });

    const [updatedProduct, actionLog] = await Promise.all([
      Product.findById(product._id).lean(),
      AdminActionLog.findOne({ actionType: 'report_content_hidden' }).lean()
    ]);

    expect(updatedProduct.status).toBe('hidden');
    expect(actionLog.targetType).toBe('report');
  });

  test('admin manages support requests with order context and action logs', async () => {
    const admin = await createAdmin();
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller);
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: { orderNumber: 'NW-SUPPORT-TOOLS' }
    });
    const request = await SupportRequest.create({
      userId: buyer._id,
      name: 'Support Buyer',
      email: 'support-buyer@example.com',
      subject: 'Where is my order?',
      message: 'Please check this order.',
      orderNumber: order.orderNumber
    });

    await api()
      .get('/api/admin/support/requests')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data[0].subject).toBe('Where is my order?');
      });

    await api()
      .patch(`/api/admin/support/requests/${request._id}/assign`)
      .set('Authorization', authHeader(admin))
      .send({})
      .expect(200)
      .expect((res) => {
        expect(res.body.data.assignedAdmin._id).toBe(admin._id.toString());
      });

    await api()
      .post(`/api/admin/support/requests/${request._id}/reply`)
      .set('Authorization', authHeader(admin))
      .send({ message: 'We are checking this now.' })
      .expect(201)
      .expect((res) => {
        expect(res.body.data.replies.length).toBe(1);
        expect(res.body.data.relatedOrder.orderNumber).toBe('NW-SUPPORT-TOOLS');
      });

    await api()
      .patch(`/api/admin/support/requests/${request._id}/status`)
      .set('Authorization', authHeader(admin))
      .send({ status: 'waiting_on_user', reason: 'Need buyer confirmation' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.status).toBe('waiting_on_user');
      });

    const actionTypes = await AdminActionLog.distinct('actionType', { targetType: 'support' });
    expect(actionTypes).toEqual(expect.arrayContaining(['support_assigned', 'support_reply', 'support_status_change']));
  });

  test('admin edits legal content, settings, categories, regions, and featured content', async () => {
    const admin = await createAdmin();
    const seller = await createSeller();
    const product = await createProduct(seller, { title: 'Featured Admin Product' });

    await api()
      .get('/api/admin/content/pages')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.some((page) => page.slug === 'privacy-policy')).toBe(true);
      });

    await api()
      .patch('/api/admin/content/pages/privacy-policy')
      .set('Authorization', authHeader(admin))
      .send({
        title: 'Privacy Policy QA',
        sections: [{ heading: 'QA Heading', body: 'QA Body' }],
        isPublished: true,
        reason: 'QA legal edit'
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.title).toBe('Privacy Policy QA');
      });

    await api()
      .get('/api/content/privacy-policy')
      .expect(200)
      .expect((res) => {
        expect(res.body.data.title).toBe('Privacy Policy QA');
      });

    await api()
      .patch('/api/admin/settings/platformCommissionPercentage')
      .set('Authorization', authHeader(admin))
      .send({ value: 12.5, reason: 'QA setting edit' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.value).toBe(12.5);
      });

    const category = await api()
      .post('/api/admin/categories')
      .set('Authorization', authHeader(admin))
      .send({ name: 'QA Category', description: 'Admin tools category' })
      .expect(201);

    await api()
      .patch(`/api/admin/categories/${category.body.data._id}`)
      .set('Authorization', authHeader(admin))
      .send({ name: 'QA Category Updated', isEnabled: false })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.isEnabled).toBe(false);
      });

    const region = await api()
      .post('/api/admin/regions')
      .set('Authorization', authHeader(admin))
      .send({ name: 'QA Region', state: 'QA State' })
      .expect(201);

    await api()
      .delete(`/api/admin/regions/${region.body.data._id}`)
      .set('Authorization', authHeader(admin))
      .send({ reason: 'QA delete' })
      .expect(200);

    await api()
      .post(`/api/admin/featured/products/${product._id}`)
      .set('Authorization', authHeader(admin))
      .send({ reason: 'QA feature' })
      .expect(201);

    await api()
      .get('/api/admin/featured')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.products[0].title).toBe('Featured Admin Product');
      });

    const [contentPage, setting, savedCategory, savedRegion, actionTypes] = await Promise.all([
      ContentPage.findOne({ slug: 'privacy-policy' }).lean(),
      AppSetting.findOne({ key: 'platformCommissionPercentage' }).lean(),
      Category.findOne({ slug: 'qa-category' }).lean(),
      Region.findById(region.body.data._id).lean(),
      AdminActionLog.distinct('actionType')
    ]);

    expect(contentPage.title).toBe('Privacy Policy QA');
    expect(setting.value).toBe(12.5);
    expect(savedCategory.name).toBe('QA Category Updated');
    expect(savedRegion).toBeNull();
    expect(actionTypes).toEqual(expect.arrayContaining([
      'content_page_updated',
      'setting_changed',
      'category_created',
      'category_updated',
      'region_created',
      'region_deleted',
      'product_featured'
    ]));
  });
});
