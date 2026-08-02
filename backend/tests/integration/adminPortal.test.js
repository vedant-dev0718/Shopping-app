const SupportRequest = require('../../src/modules/contact/supportRequest.model');
const SellerPayout = require('../../src/modules/finance/sellerPayout.model');
const BlockedUser = require('../../src/modules/safety/blockedUser.model');
const Report = require('../../src/modules/safety/report.model');
const AdminActionLog = require('../../src/modules/adminManagement/adminActionLog.model');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createAdmin, createBuyer, createSeller, password } = require('../helpers/auth.helper');
const { createProduct, createReel } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');
const { generateTotpCode } = require('../../src/utils/totp');

describe('admin portal foundation API', () => {
  test('admin login succeeds while buyer login is rejected from admin login', async () => {
    const adminTotpSecret = 'JBSWY3DPEHPK3PXP';
    const admin = await createAdmin({ email: 'portal-admin@example.com', password, adminTotpSecret });
    const buyer = await createBuyer({ email: 'portal-buyer@example.com', password });

    await api()
      .post('/api/admin/login')
      .send({ email: admin.email, password })
      .expect(400);

    await api()
      .post('/api/admin/login')
      .send({ email: admin.email, password, totpCode: '000000' })
      .expect(401);

    const login = await api()
      .post('/api/admin/login')
      .send({ email: admin.email, password, totpCode: generateTotpCode(adminTotpSecret) })
      .expect(200);

    expect(login.body.data.token).toBeTruthy();
    expect(login.body.data.user.role).toBe('admin');
    expect(login.body.data.user.passwordHash).toBeUndefined();

    await api()
      .post('/api/admin/login')
      .send({ email: buyer.email, password, totpCode: generateTotpCode(adminTotpSecret) })
      .expect(403);
  });

  test('admin dashboard summary is admin-only and returns marketplace totals', async () => {
    const admin = await createAdmin();
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { title: 'Admin QA Bag', stock: 2 });
    await createReel(seller, [product], { caption: 'Admin QA reel' });
    await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        paymentStatus: 'paid',
        orderStatus: 'awaiting_seller_acceptance'
      }
    });
    await SupportRequest.create({
      name: 'Support QA',
      email: 'support@example.com',
      subject: 'Admin support',
      message: 'Please help'
    });

    await api()
      .get('/api/admin/dashboard/summary')
      .set('Authorization', authHeader(buyer))
      .expect(403);

    const summary = await api()
      .get('/api/admin/dashboard/summary')
      .set('Authorization', authHeader(admin))
      .expect(200);

    expect(summary.body.data.users.totalAdmins).toBe(1);
    expect(summary.body.data.users.totalBuyers).toBe(1);
    expect(summary.body.data.sellers.activeSellers).toBe(1);
    expect(summary.body.data.products.totalProducts).toBe(1);
    expect(summary.body.data.orders.awaitingSellerAcceptance).toBe(1);
    expect(summary.body.data.support.openSupportRequests).toBe(1);
    expect(summary.body.data.revenue.netSales).toBeDefined();
    expect(summary.body.data.topProducts[0].title).toBe('Admin QA Bag');
    expect(summary.body.data.topSellers[0].email).toBe(seller.email);
    expect(summary.body.data.topReels[0].caption).toBe('Admin QA reel');
  });

  test('admin global search covers operational IDs, trust records, and admin logs', async () => {
    const admin = await createAdmin();
    const buyer = await createBuyer({ email: 'search-buyer@example.com', phone: '9990001111' });
    const seller = await createSeller({ storeName: 'Search Seller Store' });
    const product = await createProduct(seller, {
      title: 'Searchable Admin Tote',
      sku: 'SKU-ADMIN-SEARCH',
      barcode: 'BAR-ADMIN-SEARCH'
    });
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        orderNumber: 'NW-ADMIN-SEARCH',
        paymentStatus: 'paid'
      }
    });
    order.razorpayPaymentId = 'pay_admin_search';
    order.razorpayOrderId = 'order_admin_search';
    order.shiprocketOrderId = 900123;
    order.shiprocketShipmentId = 800123;
    order.trackingNumber = 'AWBADMINSEARCH';
    await order.save();
    await SupportRequest.create({
      userId: buyer._id,
      name: 'Search Support Buyer',
      email: 'support-search@example.com',
      subject: 'Search support ticket',
      message: 'Please find this ticket',
      orderNumber: order.orderNumber
    });
    await Report.create({
      reporterId: buyer._id,
      targetType: 'product',
      targetId: product._id,
      targetOwnerId: seller._id,
      reason: 'counterfeit',
      details: 'searchable report details'
    });
    await SellerPayout.create({
      sellerId: seller._id,
      payoutNumber: 'PO-ADMIN-SEARCH',
      amount: 120,
      transactionReference: 'UTR-ADMIN-SEARCH'
    });
    await BlockedUser.create({ blockerId: buyer._id, blockedUserId: seller._id });
    await AdminActionLog.create({
      adminId: admin._id,
      actionType: 'qa_admin_search_action',
      targetType: 'product',
      targetId: product._id,
      reason: 'Search action log reason'
    });

    const productSearch = await api()
      .get('/api/admin/search?q=SKU-ADMIN-SEARCH&type=products')
      .set('Authorization', authHeader(admin))
      .expect(200);

    expect(productSearch.body.data.results.products[0].title).toBe('Searchable Admin Tote');
    expect(productSearch.body.data.results.users).toEqual([]);

    await api()
      .get('/api/admin/search?q=BAR-ADMIN-SEARCH&type=products')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.results.products[0].barcode).toBe('BAR-ADMIN-SEARCH');
      });

    const orderSearch = await api()
      .get('/api/admin/search?q=NW-ADMIN-SEARCH&type=orders')
      .set('Authorization', authHeader(admin))
      .expect(200);

    expect(orderSearch.body.data.results.orders[0].orderNumber).toBe('NW-ADMIN-SEARCH');

    await api()
      .get('/api/admin/search?q=pay_admin_search&type=payments')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.results.payments[0].razorpayPaymentId).toBe('pay_admin_search');
      });

    await api()
      .get('/api/admin/search?q=900123&type=shipments')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.results.shipments[0].shiprocketOrderId).toBe(900123);
      });

    await api()
      .get('/api/admin/search?q=support-search@example.com&type=support')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.results.support[0].email).toBe('support-search@example.com');
      });

    await api()
      .get('/api/admin/search?q=counterfeit&type=reports')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.results.reports[0].reason).toBe('counterfeit');
      });

    await api()
      .get('/api/admin/search?q=PO-ADMIN-SEARCH&type=payouts')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.results.payouts[0].payoutNumber).toBe('PO-ADMIN-SEARCH');
      });

    await api()
      .get(`/api/admin/search?q=${buyer._id}&type=blocks`)
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.results.blocks[0].blockerId.email).toBe('search-buyer@example.com');
      });

    await api()
      .get('/api/admin/search?q=qa_admin_search_action&type=actions')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.results.actions[0].actionType).toBe('qa_admin_search_action');
      });

    await api()
      .get('/api/admin/action-logs?q=qa_admin_search_action')
      .set('Authorization', authHeader(buyer))
      .expect(403);

    await api()
      .get('/api/admin/action-logs?q=qa_admin_search_action')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data[0].actionType).toBe('qa_admin_search_action');
        expect(res.body.data[0].adminId.passwordHash).toBeUndefined();
      });
  });
});
