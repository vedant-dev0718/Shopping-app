const CancellationRequest = require('../../src/modules/cancellations/cancellationRequest.model');
const Refund = require('../../src/modules/refunds/refund.model');
const ReturnRequest = require('../../src/modules/returns/return.model');
const AdminActionLog = require('../../src/modules/adminManagement/adminActionLog.model');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createAdmin, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');

describe('admin operations API', () => {
  test('orders, payments, and shipments are searchable and admin-only', async () => {
    const admin = await createAdmin();
    const buyer = await createBuyer({ email: 'ops-buyer@example.com' });
    const seller = await createSeller({ storeName: 'Ops Seller Store' });
    const product = await createProduct(seller, { title: 'Ops Product', stock: 5 });
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        orderNumber: 'NW-OPS-SEARCH',
        paymentMethod: 'card',
        paymentStatus: 'paid',
        totalPlatformCommission: 25,
        totalSellerEarnings: 225
      }
    });
    order.razorpayPaymentId = 'pay_ops_search';
    order.razorpayOrderId = 'order_ops_search';
    order.trackingNumber = 'AWBOPS123';
    order.trackingCarrier = 'Shiprocket QA';
    order.trackingStatus = 'Shipped';
    order.shiprocketShipmentId = 12345;
    await order.save();

    await api()
      .get('/api/admin/orders?q=NW-OPS-SEARCH')
      .set('Authorization', authHeader(buyer))
      .expect(403);

    const list = await api()
      .get('/api/admin/orders?q=pay_ops_search&paymentStatus=paid')
      .set('Authorization', authHeader(admin))
      .expect(200);

    expect(list.body.data[0].orderNumber).toBe('NW-OPS-SEARCH');

    const detail = await api()
      .get(`/api/admin/orders/${order._id}`)
      .set('Authorization', authHeader(admin))
      .expect(200);

    expect(detail.body.data.moneyBreakdown.platformCommission).toBe(25);
    expect(detail.body.data.payment.razorpayPaymentId).toBe('pay_ops_search');
    expect(detail.body.data.shipping.awb).toBe('AWBOPS123');

    await api()
      .get('/api/admin/payments/razorpay/pay_ops_search')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.order.orderNumber).toBe('NW-OPS-SEARCH');
      });

    await api()
      .get('/api/admin/shipments/awb/AWBOPS123')
      .set('Authorization', authHeader(admin))
      .expect(200)
      .expect((res) => {
        expect(res.body.data.currentStatus).toBe('Shipped');
      });

    await api()
      .patch(`/api/admin/shipments/${order._id}/status`)
      .set('Authorization', authHeader(admin))
      .send({ status: 'Delivered', reason: 'Delivered by ops test' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.currentStatus).toBe('Delivered');
      });

    const shipmentLog = await AdminActionLog.findOne({ actionType: 'shipment_status_update' }).lean();
    expect(shipmentLog).toBeTruthy();
  });

  test('refunds, returns, cancellations, and order status actions are logged', async () => {
    const admin = await createAdmin();
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { title: 'Ops Return Product', stock: 5 });
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        orderNumber: 'NW-OPS-ACTIONS',
        paymentStatus: 'paid'
      }
    });
    order.razorpayPaymentId = 'pay_ops_actions';
    await order.save();

    const refund = await Refund.create({
      orderId: order._id,
      buyerId: buyer._id,
      sellerId: seller._id,
      razorpayPaymentId: 'pay_ops_actions',
      amount: 50,
      reason: 'Ops refund test'
    });

    const returnRequest = await ReturnRequest.create({
      orderId: order._id,
      buyerId: buyer._id,
      sellerId: seller._id,
      items: [{
        itemId: order.items[0]._id,
        productId: product._id,
        titleSnapshot: product.title,
        quantity: 1,
        refundAmount: 50
      }],
      reason: 'Ops return test',
      refundAmount: 50
    });

    const cancellation = await CancellationRequest.create({
      orderId: order._id,
      buyerId: buyer._id,
      sellerId: seller._id,
      requestedBy: 'buyer',
      reason: 'Ops cancellation test',
      status: 'requested'
    });

    await api()
      .patch(`/api/admin/orders/${order._id}/status`)
      .set('Authorization', authHeader(admin))
      .send({ orderStatus: 'processing', reason: 'Ops status test' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.order.orderStatus).toBe('processing');
      });

    await api()
      .patch(`/api/admin/refunds/${refund._id}/mark-success`)
      .set('Authorization', authHeader(admin))
      .send({ reason: 'Ops refund success' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.status).toBe('refunded');
      });

    await api()
      .patch(`/api/admin/returns/${returnRequest._id}/approve`)
      .set('Authorization', authHeader(admin))
      .send({ reason: 'Ops return approve' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.status).toBe('approved');
      });

    await api()
      .patch(`/api/admin/cancellations/${cancellation._id}/reject`)
      .set('Authorization', authHeader(admin))
      .send({ rejectionReason: 'Ops cancellation reject' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.cancellation.status).toBe('rejected');
      });

    const actionTypes = await AdminActionLog.distinct('actionType');
    expect(actionTypes).toEqual(expect.arrayContaining([
      'order_status_update',
      'refund_refunded',
      'return_approved',
      'cancellation_rejected'
    ]));
  });
});
