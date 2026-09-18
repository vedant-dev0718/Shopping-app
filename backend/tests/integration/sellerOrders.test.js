const Order = require('../../src/modules/orders/order.model');
const env = require('../../src/config/env');
const { razorpay } = require('../../src/utils/razorpay');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');
const {
  mockShiprocketAuth,
  mockServiceability,
  mockPickupLocation,
  mockShipmentCreate,
  mockAssignAwb,
  mockLabel
} = require('../helpers/shiprocket.mock');

describe('seller order management API', () => {
  let originalManualCaptureEnabled;

  beforeEach(() => {
    originalManualCaptureEnabled = env.razorpayManualCaptureEnabled;
  });

  afterEach(() => {
    env.razorpayManualCaptureEnabled = originalManualCaptureEnabled;
  });

  test('seller sees only own order items and can process and ship with tracking', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const otherSeller = await createSeller({ email: 'other-orders@example.com' });
    const product = await createProduct(seller);
    const otherProduct = await createProduct(otherSeller);
    const order = await createOrder({ buyer, seller, product });
    await createOrder({ buyer, seller: otherSeller, product: otherProduct });

    const list = await api().get('/api/seller/orders').set('Authorization', authHeader(seller)).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].items[0].sellerId.toString()).toBe(seller._id.toString());

    const detail = await api().get(`/api/seller/orders/${order._id}`).set('Authorization', authHeader(seller)).expect(200);
    expect(detail.body.data.shippingInfo).toBeTruthy();

    await api()
      .patch(`/api/seller/orders/${order._id}/status`)
      .set('Authorization', authHeader(seller))
      .send({ orderStatus: 'processing' })
      .expect(200);

    await api().patch(`/api/seller/orders/${order._id}/ship`).set('Authorization', authHeader(seller)).send({}).expect(400);

    await api()
      .patch(`/api/seller/orders/${order._id}/ship`)
      .set('Authorization', authHeader(seller))
      .send({
        trackingNumber: 'TRACK123',
        trackingCarrier: 'QA Courier',
        trackingUrl: 'shiprocket.co/tracking/TRACK123'
      })
      .expect(200);

    const updated = await Order.findById(order._id).lean();
    expect(updated.orderStatus).toBe('shipped');
    expect(updated.trackingNumber).toBe('TRACK123');
  });

  test('seller cannot ship cancelled order or cancel delivered order', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller);
    const cancelled = await createOrder({ buyer, seller, product, overrides: { orderStatus: 'cancelled', itemStatus: 'cancelled' } });
    const delivered = await createOrder({ buyer, seller, product, overrides: { orderStatus: 'delivered', itemStatus: 'delivered' } });

    await api()
      .patch(`/api/seller/orders/${cancelled._id}/ship`)
      .set('Authorization', authHeader(seller))
      .send({ trackingNumber: 'NOPE' })
      .expect(400);

    await api()
      .patch(`/api/seller/orders/${delivered._id}/cancel`)
      .set('Authorization', authHeader(seller))
      .send({ cancelReason: 'Cannot fulfill' })
      .expect(400);
  });

  test('seller ship accepts legacy courier alias and stores it as trackingCarrier', async () => {
    const buyer = await createBuyer({ email: 'seller-ship-alias-buyer@example.com' });
    const seller = await createSeller({ email: 'seller-ship-alias-seller@example.com' });
    const product = await createProduct(seller);
    const order = await createOrder({ buyer, seller, product });

    await api()
      .patch(`/api/seller/orders/${order._id}/status`)
      .set('Authorization', authHeader(seller))
      .send({ orderStatus: 'processing' })
      .expect(200);

    await api()
      .patch(`/api/seller/orders/${order._id}/ship`)
      .set('Authorization', authHeader(seller))
      .send({
        trackingNumber: 'TRACK-ALIAS-123',
        courier: 'Legacy Courier Name',
        trackingUrl: 'https://tracking.example/TRACK-ALIAS-123'
      })
      .expect(200);

    const updated = await Order.findById(order._id).lean();
    expect(updated.trackingNumber).toBe('TRACK-ALIAS-123');
    expect(updated.trackingCarrier).toBe('Legacy Courier Name');
  });

  test('seller can accept an awaiting acceptance order and stock is deducted once', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const otherSeller = await createSeller({ email: 'accept-other@example.com' });
    const product = await createProduct(seller, { stock: 2 });
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        paymentStatus: 'paid',
        orderStatus: 'awaiting_seller_acceptance',
        itemStatus: 'awaiting_seller_acceptance'
      }
    });
    order.razorpayPaymentId = 'pay_accept_test';
    await order.save();

    await api()
      .post(`/api/seller/orders/${order._id}/accept`)
      .set('Authorization', authHeader(otherSeller))
      .send({ message: 'Trying another seller order' })
      .expect(404);

    await api()
      .post(`/api/seller/orders/${order._id}/accept`)
      .set('Authorization', authHeader(seller))
      .send({ message: 'Available' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.orderStatus).toBe('processing');
      });

    await api()
      .post(`/api/seller/orders/${order._id}/accept`)
      .set('Authorization', authHeader(seller))
      .send({ message: 'Duplicate' })
      .expect(200);

    const [updatedOrder, updatedProduct] = await Promise.all([
      Order.findById(order._id).lean(),
      require('../../src/modules/products/product.model').findById(product._id).lean()
    ]);

    expect(updatedOrder.sellerAcceptance.status).toBe('accepted');
    expect(updatedOrder.items[0].itemAcceptanceStatus).toBe('accepted');
    expect(updatedProduct.stock).toBe(1);
  });

  test('seller acceptance captures an authorized manual-capture payment once', async () => {
    env.razorpayManualCaptureEnabled = true;
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { stock: 2 });
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        paymentStatus: 'authorized',
        orderStatus: 'awaiting_seller_acceptance',
        itemStatus: 'awaiting_seller_acceptance'
      }
    });
    order.paymentCaptureMode = 'manual';
    order.razorpayOrderId = 'order_manual_accept';
    order.razorpayPaymentId = 'pay_accept_test';
    order.paymentFlow = {
      captureAfterSellerAcceptance: true,
      razorpayOrderId: 'order_manual_accept',
      razorpayPaymentId: 'pay_accept_test',
      authorizedAt: new Date()
    };
    await order.save();

    await api()
      .post(`/api/seller/orders/${order._id}/accept`)
      .set('Authorization', authHeader(seller))
      .send({ message: 'Available' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.orderStatus).toBe('processing');
        expect(res.body.data.paymentStatus).toBe('paid');
      });

    const updatedOrder = await Order.findById(order._id).lean();
    expect(updatedOrder.paymentStatus).toBe('paid');
    expect(updatedOrder.paymentFlow.capturedAt).toBeTruthy();
    expect(updatedOrder.paymentFlow.captureResponseSafeSummary.status).toBe('captured');
  });

  test('seller can create a Shiprocket shipment label from an accepted order', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller);
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        paymentStatus: 'paid',
        orderStatus: 'processing',
        itemStatus: 'processing'
      }
    });

    mockShiprocketAuth();
    mockPickupLocation();
    mockServiceability([{ courier_company_id: 7, courier_name: 'QA Express' }]);
    mockShipmentCreate({ order_id: 909, shipment_id: 808 });
    mockAssignAwb('AWB-LABEL-808');
    mockLabel('https://example.com/labels/AWB-LABEL-808.pdf');

    await api()
      .post(`/api/seller/orders/${order._id}/create-shipment`)
      .set('Authorization', authHeader(seller))
      .send({
        weight: 0.5,
        length: 12,
        breadth: 10,
        height: 4
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.trackingNumber).toBe('AWB-LABEL-808');
        expect(res.body.data.trackingCarrier).toBe('QA Express');
        expect(res.body.data.shippingLabelUrl).toContain('AWB-LABEL-808.pdf');
      });

    const updated = await Order.findById(order._id).lean();
    expect(updated.orderStatus).toBe('shipped');
    expect(updated.shiprocketShipmentId).toBe(808);
    expect(updated.items[0].shippingLabelUrl).toContain('AWB-LABEL-808.pdf');
  });

  test('seller rejection requires a buyer message and triggers unavailable cancellation refund flow', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { stock: 2 });
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        paymentStatus: 'paid',
        orderStatus: 'awaiting_seller_acceptance',
        itemStatus: 'awaiting_seller_acceptance'
      }
    });
    order.razorpayPaymentId = 'pay_reject_test';
    await order.save();

    await api()
      .post(`/api/seller/orders/${order._id}/reject`)
      .set('Authorization', authHeader(seller))
      .send({ reason: 'Product unavailable' })
      .expect(400);

    await api()
      .post(`/api/seller/orders/${order._id}/reject`)
      .set('Authorization', authHeader(seller))
      .send({
        reason: 'Product unavailable',
        messageToBuyer: 'Sorry, this item is no longer available. Your payment will be refunded.'
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.orderStatus).toBe('cancelled_unavailable');
        expect(res.body.data.sellerAcceptance.rejectionMessageToBuyer).toContain('refunded');
      });

    await api()
      .post(`/api/seller/orders/${order._id}/reject`)
      .set('Authorization', authHeader(seller))
      .send({
        reason: 'Product unavailable',
        messageToBuyer: 'Duplicate'
      })
      .expect(200);

    const updatedOrder = await Order.findById(order._id).lean();
    expect(updatedOrder.sellerAcceptance.status).toBe('rejected');
    expect(['refunded', 'refund_processing', 'refund_pending']).toContain(updatedOrder.refundStatus);
  });

  test('seller rejection checks Razorpay before marking authorized manual-capture money pending release', async () => {
    env.razorpayManualCaptureEnabled = true;
    razorpay.payments.fetch.mockResolvedValueOnce({
      id: 'pay_reject_authorized_test',
      order_id: 'order_manual_reject',
      status: 'authorized',
      amount: 50000,
      currency: 'INR'
    });
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { stock: 2 });
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        paymentStatus: 'authorized',
        orderStatus: 'awaiting_seller_acceptance',
        itemStatus: 'awaiting_seller_acceptance'
      }
    });
    order.paymentCaptureMode = 'manual';
    order.razorpayOrderId = 'order_manual_reject';
    order.razorpayPaymentId = 'pay_reject_authorized_test';
    order.paymentFlow = {
      captureAfterSellerAcceptance: true,
      razorpayOrderId: 'order_manual_reject',
      razorpayPaymentId: 'pay_reject_authorized_test',
      authorizedAt: new Date()
    };
    await order.save();

    await api()
      .post(`/api/seller/orders/${order._id}/reject`)
      .set('Authorization', authHeader(seller))
      .send({
        reason: 'Product unavailable',
        messageToBuyer: 'Sorry, this item is no longer available. Your authorization will be released.'
      })
      .expect(200);

    const updatedOrder = await Order.findById(order._id).lean();
    expect(updatedOrder.orderStatus).toBe('cancelled_unavailable');
    expect(updatedOrder.paymentStatus).toBe('auto_refund_pending');
    expect(updatedOrder.refundStatus).toBe('refund_pending');
    expect(updatedOrder.refundInfo.refundFailureReason).toContain('auto-refund after the manual capture timeout');
    expect(updatedOrder.inventoryReservation.status).toBe('released');
    expect(razorpay.payments.fetch).toHaveBeenCalledWith('pay_reject_authorized_test');
    expect(razorpay.payments.refund).not.toHaveBeenCalled();
  });

  test('acceptance fails when stock is no longer available', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller, { stock: 0 });
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: {
        paymentStatus: 'paid',
        orderStatus: 'awaiting_seller_acceptance',
        itemStatus: 'awaiting_seller_acceptance'
      }
    });

    await api()
      .post(`/api/seller/orders/${order._id}/accept`)
      .set('Authorization', authHeader(seller))
      .send({ message: 'Available' })
      .expect(400);
  });
});
