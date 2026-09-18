const crypto = require('crypto');

const env = require('../../config/env');
const Order = require('../orders/order.model');
const { markOrderDelivered } = require('../sellerOrders/sellerOrder.service');

const normalizeStatus = (value = '') => String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');

const isDeliveredStatus = (status = '') => {
  const normalized = normalizeStatus(status);

  return normalized.includes('delivered') && !/(rto|return|returned|seller)/i.test(normalized);
};

const getNestedValues = (value, keys, results = []) => {
  if (!value || typeof value !== 'object') {
    return results;
  }

  Object.entries(value).forEach(([key, child]) => {
    if (keys.includes(key)) {
      results.push(child);
    }

    if (child && typeof child === 'object') {
      getNestedValues(child, keys, results);
    }
  });

  return results;
};

const firstPresent = (...values) => values.flat().find((value) => value !== undefined && value !== null && value !== '');

const parseWebhookBody = (body) => {
  if (Buffer.isBuffer(body)) {
    return body.length > 0 ? JSON.parse(body.toString('utf8')) : {};
  }

  return body || {};
};

const verifyShiprocketSignature = (rawBody, signature) => {
  if (!signature || !Buffer.isBuffer(rawBody)) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', env.shiprocketWebhookSecret)
    .update(rawBody)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return expectedBuffer.length === signatureBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
};

const extractShiprocketEvent = (payload = {}) => {
  const status = firstPresent(
    getNestedValues(payload, ['current_status', 'currentStatus', 'shipment_status', 'shipmentStatus', 'status', 'status_name', 'statusName'])
  );
  const shipmentId = firstPresent(
    getNestedValues(payload, ['shipment_id', 'shipmentId', 'shiprocket_shipment_id', 'shiprocketShipmentId'])
  );
  const orderId = firstPresent(
    getNestedValues(payload, ['order_id', 'orderId', 'shiprocket_order_id', 'shiprocketOrderId'])
  );
  const awb = firstPresent(
    getNestedValues(payload, ['awb', 'awb_code', 'awbCode'])
  );
  const eventTime = firstPresent(
    getNestedValues(payload, ['event_time', 'eventTime', 'status_date', 'statusDate', 'updated_at', 'updatedAt', 'delivered_date', 'deliveredDate'])
  );

  return {
    status: String(status || ''),
    shipmentId: shipmentId ? Number(shipmentId) : null,
    orderId: orderId ? Number(orderId) : null,
    awb: awb ? String(awb) : '',
    eventTime: eventTime || null
  };
};

const buildOrderQuery = ({ shipmentId, orderId, awb }) => {
  const conditions = [];

  if (shipmentId) {
    conditions.push({ shiprocketShipmentId: shipmentId }, { 'items.shiprocketShipmentId': shipmentId });
  }

  if (orderId) {
    conditions.push({ shiprocketOrderId: orderId }, { 'items.shiprocketOrderId': orderId });
  }

  if (awb) {
    conditions.push({ trackingNumber: awb }, { 'items.itemTrackingNumber': awb });
  }

  return conditions.length > 0 ? { $or: conditions } : null;
};

const matchingSellerIdsForEvent = (order, { shipmentId, orderId, awb }) => {
  const sellerIds = new Set();

  (order.items || []).forEach((item) => {
    const matchesShipment = shipmentId && item.shiprocketShipmentId === shipmentId;
    const matchesOrder = orderId && item.shiprocketOrderId === orderId;
    const matchesAwb = awb && item.itemTrackingNumber === awb;

    if (matchesShipment || matchesOrder || matchesAwb) {
      sellerIds.add(item.sellerId.toString());
    }
  });

  if (sellerIds.size === 0 && (
    (shipmentId && order.shiprocketShipmentId === shipmentId)
    || (orderId && order.shiprocketOrderId === orderId)
    || (awb && order.trackingNumber === awb)
  )) {
    (order.items || []).forEach((item) => sellerIds.add(item.sellerId.toString()));
  }

  return [...sellerIds];
};

const handleShiprocketWebhook = async (req, res) => {
  const isProduction = env.nodeEnv === 'production';
  const signature = req.get('x-shiprocket-signature') || req.get('x-api-signature') || req.get('x-webhook-signature') || '';

  if (!env.shiprocketWebhookSecret) {
    if (isProduction) {
      return res.status(503).json({
        success: false,
        message: 'Shiprocket webhook is not configured on this server'
      });
    }

    console.warn('Shiprocket webhook signature verification skipped in non-production mode');
  } else if (!verifyShiprocketSignature(req.body, signature)) {
    return res.status(400).json({ success: false, message: 'Invalid Shiprocket webhook signature' });
  }

  let payload;

  try {
    payload = parseWebhookBody(req.body);
  } catch (_error) {
    return res.status(400).json({ success: false, message: 'Invalid Shiprocket webhook payload' });
  }

  const event = extractShiprocketEvent(payload);
  const query = buildOrderQuery(event);

  if (!query) {
    return res.status(202).json({ success: true, message: 'Shiprocket webhook ignored: no shipment identifier' });
  }

  const order = await Order.findOne(query);

  if (!order) {
    return res.status(202).json({ success: true, message: 'Shiprocket webhook ignored: order not found' });
  }

  order.deliveryInfo = order.deliveryInfo || {};
  order.deliveryInfo.lastCourierStatus = event.status || order.deliveryInfo.lastCourierStatus || '';
  order.deliveryInfo.lastCourierStatusAt = event.eventTime ? new Date(event.eventTime) : new Date();
  order.shiprocketRawData = payload;

  if (!isDeliveredStatus(event.status)) {
    await order.save();
    return res.status(200).json({ success: true, message: 'Shiprocket status recorded', data: { orderId: order._id, status: event.status } });
  }

  const sellerIds = matchingSellerIdsForEvent(order, event);

  for (const sellerId of sellerIds) {
    await markOrderDelivered(sellerId, order._id.toString(), {
      confirmationSource: 'shiprocket_webhook',
      deliveredAt: event.eventTime || new Date(),
      courierStatus: event.status || 'Delivered',
      courierStatusAt: event.eventTime || new Date(),
      rawWebhookPayload: payload
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Shiprocket delivered status applied',
    data: { orderId: order._id, status: event.status, deliveredSellerCount: sellerIds.length }
  });
};

module.exports = {
  handleShiprocketWebhook,
  extractShiprocketEvent,
  isDeliveredStatus
};
