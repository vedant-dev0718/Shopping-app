const Comment = require('../../src/modules/comments/comment.model');
const SellerProfile = require('../../src/modules/sellers/sellerProfile.model');
const AdminActionLog = require('../../src/modules/adminManagement/adminActionLog.model');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createAdmin, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct, createReel } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');

describe('admin management API', () => {
  test('users are searchable, detailed, protected, and status actions are logged', async () => {
    const admin = await createAdmin();
    const buyer = await createBuyer({ name: 'Managed Buyer', email: 'managed-buyer@example.com' });

    await api()
      .get('/api/admin/users?q=Managed')
      .set('Authorization', authHeader(buyer))
      .expect(403);

    const list = await api()
      .get('/api/admin/users?q=Managed&role=buyer&accountStatus=active')
      .set('Authorization', authHeader(admin))
      .expect(200);

    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].email).toBe('managed-buyer@example.com');
    expect(list.body.data[0].passwordHash).toBeUndefined();

    const detail = await api()
      .get(`/api/admin/users/${buyer._id}`)
      .set('Authorization', authHeader(admin))
      .expect(200);

    expect(detail.body.data.user.email).toBe('managed-buyer@example.com');
    expect(detail.body.data.metrics.totalOrders).toBe(0);

    await api()
      .patch(`/api/admin/users/${buyer._id}/status`)
      .set('Authorization', authHeader(admin))
      .send({ accountStatus: 'banned', reason: 'Policy test' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.accountStatus).toBe('banned');
      });

    const log = await AdminActionLog.findOne({ targetType: 'user', targetId: buyer._id }).lean();
    expect(log.actionType).toBe('user_banned');
    expect(log.reason).toBe('Policy test');
  });

  test('sellers, stores, products, reels, and comments can be managed by admins', async () => {
    const admin = await createAdmin();
    const buyer = await createBuyer();
    const seller = await createSeller({ storeName: 'Admin Managed Store' });
    const sellerProfile = await SellerProfile.findOne({ userId: seller._id });
    const product = await createProduct(seller, { title: 'Admin Managed Product', stock: 6 });
    const reel = await createReel(seller, [product], { caption: 'Admin managed reel' });
    const comment = await Comment.create({
      reelId: reel._id,
      sellerId: seller._id,
      userId: buyer._id,
      text: 'Admin managed comment'
    });

    await createOrder({ buyer, seller, product });

    const sellerDetail = await api()
      .get(`/api/admin/sellers/${sellerProfile._id}`)
      .set('Authorization', authHeader(admin))
      .expect(200);

    expect(sellerDetail.body.data.stats.productsCount).toBe(1);

    await api()
      .patch(`/api/admin/sellers/${sellerProfile._id}/commission`)
      .set('Authorization', authHeader(admin))
      .send({ commissionPercentage: 14, reason: 'Commission test' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.commissionPercentageOverride).toBe(14);
      });

    await api()
      .patch(`/api/admin/stores/${seller.testStore._id}/feature`)
      .set('Authorization', authHeader(admin))
      .send({ featured: true, reason: 'Feature test' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.featured).toBe(true);
      });

    await api()
      .patch(`/api/admin/products/${product._id}/stock`)
      .set('Authorization', authHeader(admin))
      .send({ stock: 9, reason: 'Stock count correction' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.stock).toBe(9);
      });

    await api()
      .patch(`/api/admin/reels/${reel._id}/status`)
      .set('Authorization', authHeader(admin))
      .send({ status: 'hidden', reason: 'Moderation test' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.status).toBe('hidden');
      });

    await api()
      .delete(`/api/admin/comments/${comment._id}`)
      .set('Authorization', authHeader(admin))
      .send({ reason: 'Comment moderation test' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.status).toBe('deleted');
      });

    const actionTypes = await AdminActionLog.distinct('actionType');
    expect(actionTypes).toEqual(expect.arrayContaining([
      'seller_commission_change',
      'store_featured',
      'product_stock_adjustment',
      'reel_hidden',
      'comment_deleted'
    ]));
  });
});
