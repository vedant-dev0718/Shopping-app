const Order = require('../../src/modules/orders/order.model');
const { runAutoDelivery } = require('../../src/jobs/autoDelivery.job');
const sellerOrderService = require('../../src/modules/sellerOrders/sellerOrder.service');
const env = require('../../src/config/env');
const { createBuyer, createSeller } = require('../helpers/auth.helper');
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

describe('Shiprocket integration with mocked HTTP calls', () => {
  test('shipment creation stores shipment id, AWB, courier, and tracking URL', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller);
    const order = await createOrder({ buyer, seller, product, overrides: { paymentStatus: 'paid', orderStatus: 'processing' } });

    mockShiprocketAuth();
    mockPickupLocation();
    mockServiceability();
    mockShipmentCreate();
    mockAssignAwb('AWB-QA-123');
    mockLabel();

    const shipment = await sellerOrderService.createShipmentForOrder(seller._id, order._id, {
      weight: 0.5,
      length: 10,
      breadth: 10,
      height: 10
    });

    expect(shipment.awbCode).toBe('AWB-QA-123');
    const updated = await Order.findById(order._id).lean();
    expect(updated.trackingNumber).toBe('AWB-QA-123');
    expect(updated.trackingUrl).toContain('AWB-QA-123');
  });

  test('Shiprocket delivered webhook marks the shipped order delivered with courier confirmation', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller);
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: { paymentStatus: 'paid', orderStatus: 'shipped', itemStatus: 'shipped' }
    });
    order.shippedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    order.shiprocketShipmentId = 808;
    order.shiprocketOrderId = 909;
    order.trackingNumber = 'AWB-WEBHOOK-123';
    order.items[0].shiprocketShipmentId = 808;
    order.items[0].shiprocketOrderId = 909;
    order.items[0].itemTrackingNumber = 'AWB-WEBHOOK-123';
    await order.save();

    await require('../helpers/testServer.helper').api()
      .post('/webhooks/shiprocket')
      .set('Content-Type', 'application/json')
      .send({
        shipment_id: 808,
        order_id: 909,
        awb: 'AWB-WEBHOOK-123',
        current_status: 'DELIVERED',
        delivered_date: '2026-06-17T10:00:00.000Z'
      })
      .expect(200);

    const updated = await Order.findById(order._id).lean();
    expect(updated.orderStatus).toBe('delivered');
    expect(updated.items[0].itemStatus).toBe('delivered');
    expect(updated.deliveryInfo.deliveryConfirmedBy).toBe('shiprocket_webhook');
    expect(updated.deliveryInfo.deliveryConfirmationStatus).toBe('confirmed');
    expect(updated.deliveryInfo.deliveryReviewRequired).toBe(false);
    expect(updated.deliveryInfo.lastCourierStatus).toBe('DELIVERED');
    expect(updated.deliveredAt.toISOString()).toBe('2026-06-17T10:00:00.000Z');
  });

  test('Shiprocket non-delivered webhook records courier status without marking delivered', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller);
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: { paymentStatus: 'paid', orderStatus: 'shipped', itemStatus: 'shipped' }
    });
    order.shiprocketShipmentId = 818;
    order.trackingNumber = 'AWB-IN-TRANSIT';
    order.items[0].shiprocketShipmentId = 818;
    order.items[0].itemTrackingNumber = 'AWB-IN-TRANSIT';
    await order.save();

    await require('../helpers/testServer.helper').api()
      .post('/webhooks/shiprocket')
      .set('Content-Type', 'application/json')
      .send({
        shipment_id: 818,
        awb: 'AWB-IN-TRANSIT',
        current_status: 'IN TRANSIT'
      })
      .expect(200);

    const updated = await Order.findById(order._id).lean();
    expect(updated.orderStatus).toBe('shipped');
    expect(updated.items[0].itemStatus).toBe('shipped');
    expect(updated.deliveredAt).toBeNull();
    expect(updated.deliveryInfo.lastCourierStatus).toBe('IN TRANSIT');
  });

  test('seller cannot manually mark a Shiprocket shipment delivered', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller);
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: { paymentStatus: 'paid', orderStatus: 'shipped', itemStatus: 'shipped' }
    });
    order.shiprocketShipmentId = 828;
    order.items[0].shiprocketShipmentId = 828;
    await order.save();

    await expect(
      sellerOrderService.markOrderDelivered(seller._id, order._id)
    ).rejects.toThrow('Shiprocket shipments must be marked delivered by the courier webhook');

    const updated = await Order.findById(order._id).lean();
    expect(updated.orderStatus).toBe('shipped');
    expect(updated.items[0].itemStatus).toBe('shipped');
  });

  test('14-day fallback flags shipped orders for review instead of marking delivered', async () => {
    const buyer = await createBuyer();
    const seller = await createSeller();
    const product = await createProduct(seller);
    const order = await createOrder({
      buyer,
      seller,
      product,
      overrides: { paymentStatus: 'paid', orderStatus: 'shipped', itemStatus: 'shipped' }
    });
    order.shippedAt = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    order.trackingStatus = 'Shipped';
    await order.save();

    const summary = await runAutoDelivery();

    expect(summary.flaggedForReview).toBe(1);
    const updated = await Order.findById(order._id).lean();
    expect(updated.orderStatus).toBe('shipped');
    expect(updated.items[0].itemStatus).toBe('shipped');
    expect(updated.deliveredAt).toBeNull();
    expect(updated.deliveryInfo.deliveryConfirmationStatus).toBe('review_required');
    expect(updated.deliveryInfo.deliveryReviewRequired).toBe(true);
    expect(updated.trackingStatus).toBe('Delivery confirmation pending - review required');
  });

  test('Shiprocket webhook returns 503 in production when webhook secret is missing', async () => {
    const previousNodeEnv = env.nodeEnv;
    const previousWebhookSecret = env.shiprocketWebhookSecret;

    env.nodeEnv = 'production';
    env.shiprocketWebhookSecret = '';

    try {
      const response = await require('../helpers/testServer.helper').api()
        .post('/webhooks/shiprocket')
        .set('Content-Type', 'application/json')
        .send({ shipment_id: 123, current_status: 'DELIVERED' })
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not configured');
    } finally {
      env.nodeEnv = previousNodeEnv;
      env.shiprocketWebhookSecret = previousWebhookSecret;
    }
  });
});
