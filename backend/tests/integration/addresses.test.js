const crypto = require('crypto');

const Order = require('../../src/modules/orders/order.model');
const Address = require('../../src/modules/addresses/address.model');
const env = require('../../src/config/env');
const { razorpay } = require('../../src/utils/razorpay');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createAdmin, createBuyer, createSeller } = require('../helpers/auth.helper');
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

const deliveryPayload = {
  label: 'Home',
  contactName: 'Buyer QA',
  contactPhone: '9999999999',
  email: 'buyer@example.com',
  addressLine1: 'House 12, QA Street',
  addressLine2: 'Near Test Market',
  landmark: 'Opposite Metro',
  city: 'Delhi',
  state: 'Delhi',
  country: 'India',
  postalCode: '110001',
  addressType: 'home',
  deliveryInstructions: 'Call before delivery'
};

const pickupPayload = {
  label: 'Main Store',
  contactName: 'Seller QA',
  contactPhone: '9999999999',
  email: 'seller@example.com',
  addressLine1: 'Shop 22, QA Market',
  addressLine2: 'Main Road',
  landmark: 'Near City Mall',
  city: 'Delhi',
  state: 'Delhi',
  country: 'India',
  postalCode: '110001',
  addressType: 'store',
  pickupInstructions: 'Pickup from back gate',
  shiprocketPickupLocationNickname: 'Main Store Delhi'
};

const signPayment = (razorpayOrderId, razorpayPaymentId) => crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(`${razorpayOrderId}|${razorpayPaymentId}`)
  .digest('hex');

describe('address APIs and order snapshots', () => {
  test('buyer can create, default, validate, and isolate delivery addresses', async () => {
    const buyer = await createBuyer();
    const otherBuyer = await createBuyer({ email: 'other-address-buyer@example.com' });

    const first = await api()
      .post('/api/addresses/delivery')
      .set('Authorization', authHeader(buyer))
      .send(deliveryPayload)
      .expect(201);

    expect(first.body.data.isDefault).toBe(true);

    await api()
      .post('/api/addresses/delivery')
      .set('Authorization', authHeader(buyer))
      .send({ ...deliveryPayload, label: 'Work', postalCode: '110002', addressType: 'work', isDefault: true })
      .expect(201);

    const list = await api().get('/api/addresses/delivery').set('Authorization', authHeader(buyer)).expect(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.data.filter((address) => address.isDefault)).toHaveLength(1);
    expect(list.body.data[0].label).toBe('Work');

    await api()
      .get(`/api/addresses/delivery/${first.body.data._id}`)
      .set('Authorization', authHeader(otherBuyer))
      .expect(404);

    await api()
      .post('/api/addresses/delivery/validate')
      .set('Authorization', authHeader(buyer))
      .send({ ...deliveryPayload, postalCode: '123' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.isValid).toBe(false);
        expect(res.body.data.errors).toContain('Pincode must be 6 digits.');
      });
  });

  test('seller can create, default, sync, and isolate pickup addresses', async () => {
    const seller = await createSeller();
    const otherSeller = await createSeller({ email: 'other-pickup-seller@example.com' });

    const first = await api()
      .post('/api/seller/pickup-addresses')
      .set('Authorization', authHeader(seller))
      .send(pickupPayload)
      .expect(201);

    expect(first.body.data.isDefault).toBe(true);

    const second = await api()
      .post('/api/seller/pickup-addresses')
      .set('Authorization', authHeader(seller))
      .send({ ...pickupPayload, label: 'Warehouse', postalCode: '110002', addressType: 'warehouse', isDefault: true })
      .expect(201);

    await api()
      .get(`/api/seller/pickup-addresses/${first.body.data._id}`)
      .set('Authorization', authHeader(otherSeller))
      .expect(404);

    mockShiprocketAuth();
    mockPickupLocation({ pickup_id: 'pickup_warehouse' });

    await api()
      .post(`/api/seller/pickup-addresses/${second.body.data._id}/sync-shiprocket`)
      .set('Authorization', authHeader(seller))
      .send({})
      .expect(200)
      .expect((res) => {
        expect(res.body.data.shiprocket.isSyncedToShiprocket).toBe(true);
      });
  });

  test('seller pickup sync treats an existing Shiprocket pickup location as synced', async () => {
    const seller = await createSeller();

    const pickup = await api()
      .post('/api/seller/pickup-addresses')
      .set('Authorization', authHeader(seller))
      .send(pickupPayload)
      .expect(201);

    mockShiprocketAuth();
    mockPickupLocation({ message: 'Pickup location already exists' }, 422);

    await api()
      .post(`/api/seller/pickup-addresses/${pickup.body.data._id}/sync-shiprocket`)
      .set('Authorization', authHeader(seller))
      .send({})
      .expect(200)
      .expect((res) => {
        expect(res.body.data.shiprocket.isSyncedToShiprocket).toBe(true);
        expect(res.body.data.shiprocket.syncStatus).toBe('synced');
      });
  });

  test('checkout can use deliveryAddressId and saves immutable shippingAddressSnapshot', async () => {
    const originalManualCaptureEnabled = env.razorpayManualCaptureEnabled;
    env.razorpayManualCaptureEnabled = true;

    try {
      const buyer = await createBuyer();
      const seller = await createSeller();
      const product = await createProduct(seller, { price: 250, stock: 2 });
      const address = await Address.create({
        ...deliveryPayload,
        userId: buyer._id,
        addressOwnerType: 'buyer',
        addressPurpose: 'delivery',
        isDefault: true
      });

      await api().post('/api/cart/items').set('Authorization', authHeader(buyer)).send({ productId: product._id, quantity: 1 }).expect(201);

      const start = await api().post('/api/checkout/start').set('Authorization', authHeader(buyer)).expect(200);
      const razorpayOrderId = start.body.data.razorpayOrderId;
      const razorpayPaymentId = 'pay_address_checkout_123';

      razorpay.payments.fetch.mockResolvedValueOnce({
        id: razorpayPaymentId,
        order_id: razorpayOrderId,
        status: 'authorized',
        amount: 34900,
        currency: 'INR',
        method: 'upi'
      });

      const placed = await api()
        .post('/api/checkout/verify')
        .set('Authorization', authHeader(buyer))
        .send({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: signPayment(razorpayOrderId, razorpayPaymentId),
          deliveryAddressId: address._id,
          paymentMethod: 'UPI'
        })
        .expect(201);

      const order = await Order.findById(placed.body.data.orderId).lean();
      expect(order.shippingAddressSnapshot.contactName).toBe(deliveryPayload.contactName);
      expect(order.shippingAddressSnapshot.addressLine1).toBe(deliveryPayload.addressLine1);
      expect(order.shippingInfo.postalCode).toBe(deliveryPayload.postalCode);

      address.addressLine1 = 'Changed after order';
      await address.save();
      const unchanged = await Order.findById(order._id).lean();
      expect(unchanged.shippingAddressSnapshot.addressLine1).toBe(deliveryPayload.addressLine1);
    } finally {
      env.razorpayManualCaptureEnabled = originalManualCaptureEnabled;
    }
  });

  test('shipment uses selected pickup address and saves pickupAddressSnapshot', async () => {
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
        itemStatus: 'processing',
        shippingInfo: {
          name: 'Buyer QA',
          email: 'buyer@example.com',
          phone: '9999999999',
          address: 'House 12, QA Street',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001'
        }
      }
    });
    order.shippingAddressSnapshot = {
      contactName: 'Buyer QA',
      contactPhone: '9999999999',
      email: 'buyer@example.com',
      addressLine1: 'House 12, QA Street',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      postalCode: '110001'
    };
    await order.save();

    const pickup = await Address.create({
      ...pickupPayload,
      sellerId: seller._id,
      userId: seller._id,
      addressOwnerType: 'seller',
      addressPurpose: 'pickup',
      isDefault: true,
      shiprocket: {
        pickupLocationNickname: 'Main Store Delhi',
        isSyncedToShiprocket: true,
        syncStatus: 'synced'
      }
    });

    mockShiprocketAuth();
    mockServiceability([{ courier_company_id: 7, courier_name: 'QA Express' }]);
    mockShipmentCreate({ order_id: 909, shipment_id: 808 });
    mockAssignAwb('AWB-LABEL-808');
    mockLabel('https://example.com/labels/AWB-LABEL-808.pdf');

    await api()
      .post(`/api/seller/orders/${order._id}/create-shipment`)
      .set('Authorization', authHeader(seller))
      .send({
        pickupAddressId: pickup._id,
        weight: 0.5,
        length: 12,
        breadth: 10,
        height: 4
      })
      .expect(200);

    const updated = await Order.findById(order._id).lean();
    expect(updated.pickupAddressSnapshot.contactName).toBe(pickupPayload.contactName);
    expect(updated.pickupAddressSnapshot.shiprocketPickupLocationNickname).toBe('Main Store Delhi');
  });

  test('admin can view saved addresses', async () => {
    const admin = await createAdmin();
    const buyer = await createBuyer();
    const address = await Address.create({
      ...deliveryPayload,
      userId: buyer._id,
      addressOwnerType: 'buyer',
      addressPurpose: 'delivery',
      isDefault: true
    });

    await api().get('/api/admin/addresses').set('Authorization', authHeader(admin)).expect(200)
      .expect((res) => {
        expect(res.body.data.some((item) => item._id === address._id.toString())).toBe(true);
      });
  });
});
