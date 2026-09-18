/**
 * End-to-end backend flow: Seller product -> Reel -> Buyer discovery -> Cart -> COD order
 * -> Seller accept -> Ship -> Deliver, with online Razorpay path verified in parallel.
 */

const crypto = require('crypto');

const Order = require('../../src/modules/orders/order.model');
const Product = require('../../src/modules/products/product.model');
const env = require('../../src/config/env');
const { razorpay } = require('../../src/utils/razorpay');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');

const signPayment = (orderId, paymentId) =>
    crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

const shippingInfo = {
    name: 'E2E Buyer',
    email: 'e2e-buyer@example.com',
    phone: '9000000001',
    address: '1 E2E Lane',
    city: 'Jaipur',
    state: 'Rajasthan',
    postalCode: '302001',
};

describe('Full backend E2E flow', () => {
    let seller, buyer, productId, reelId;

    beforeEach(async () => {
        seller = await createSeller({ email: `e2e-seller-${Date.now()}@example.com` });
        buyer = await createBuyer({ email: `e2e-buyer-${Date.now()}@example.com` });
    });

    // ── Phase 1: Seller product lifecycle ──────────────────────────────────────

    test('Phase 1 — seller creates, updates, and lists own product', async () => {
        const created = await api()
            .post('/api/seller/products')
            .set('Authorization', authHeader(seller))
            .send({
                title: 'E2E Handloom Saree',
                description: 'E2E test product',
                category: 'Textiles',
                region: 'Rajasthan',
                price: 1200,
                stock: 10,
                imageUrls: ['https://example.com/saree.jpg'],
            })
            .expect(201);

        productId = created.body.data._id;
        expect(productId).toBeTruthy();

        await api()
            .patch(`/api/seller/products/${productId}`)
            .set('Authorization', authHeader(seller))
            .send({ price: 1150, stock: 8 })
            .expect(200)
            .expect((res) => {
                expect(res.body.data.price).toBe(1150);
                expect(res.body.data.stock).toBe(8);
            });

        const list = await api().get('/api/seller/products').set('Authorization', authHeader(seller)).expect(200);
        expect(list.body.data.some((p) => p._id === productId)).toBe(true);
    });

    // ── Phase 2: Seller creates reel with tagged product ───────────────────────

    test('Phase 2 — seller creates reel tagged to own product', async () => {
        const p = await api()
            .post('/api/seller/products')
            .set('Authorization', authHeader(seller))
            .send({
                title: 'Reel Tagged Product',
                description: 'For reel phase',
                category: 'Bags',
                region: 'Rajasthan',
                price: 800,
                stock: 5,
                imageUrls: ['https://example.com/bag.jpg'],
            })
            .expect(201);
        productId = p.body.data._id;

        const created = await api()
            .post('/api/seller/reels')
            .set('Authorization', authHeader(seller))
            .send({
                videoUrl: 'https://example.com/e2e-reel.mp4',
                thumbnailUrl: 'https://example.com/e2e-reel.jpg',
                caption: 'E2E reel',
                region: 'Rajasthan',
                category: 'Bags',
                taggedProductIds: [productId],
            })
            .expect(201);

        reelId = created.body.data._id;
        expect(created.body.data.taggedProductIds).toContain(productId);
    });

    test('Phase 2 — reel tagging rejects products from another seller', async () => {
        const other = await createSeller({ email: `e2e-other-${Date.now()}@example.com` });
        const otherProduct = await api()
            .post('/api/seller/products')
            .set('Authorization', authHeader(other))
            .send({
                title: 'Other Seller Product',
                description: 'Not mine',
                category: 'Bags',
                region: 'Rajasthan',
                price: 500,
                stock: 3,
                imageUrls: ['https://example.com/x.jpg'],
            })
            .expect(201);

        await api()
            .post('/api/seller/reels')
            .set('Authorization', authHeader(seller))
            .send({
                videoUrl: 'https://example.com/bad-reel.mp4',
                thumbnailUrl: 'https://example.com/bad-reel.jpg',
                caption: 'Bad tag reel',
                region: 'Rajasthan',
                category: 'Bags',
                taggedProductIds: [otherProduct.body.data._id],
            })
            .expect(400);
    });

    // ── Phase 3: Buyer discovery ───────────────────────────────────────────────

    test('Phase 3 — buyer can fetch reel feed and product list', async () => {
        const reels = await api().get('/api/reels').expect(200);
        expect(Array.isArray(reels.body.data)).toBe(true);

        const products = await api().get('/api/products').expect(200);
        expect(Array.isArray(products.body.data)).toBe(true);
    });

    // ── Phase 4: Cart and checkout start ──────────────────────────────────────

    test('Phase 4 — buyer adds item, cart reflects totals, checkout start works', async () => {
        const p = await api()
            .post('/api/seller/products')
            .set('Authorization', authHeader(seller))
            .send({
                title: 'Cart Phase Product',
                description: 'Cart test',
                category: 'Bags',
                region: 'Rajasthan',
                price: 600,
                stock: 6,
                imageUrls: ['https://example.com/cart.jpg'],
            })
            .expect(201);

        await api()
            .post('/api/cart/items')
            .set('Authorization', authHeader(buyer))
            .send({ productId: p.body.data._id, quantity: 2 })
            .expect(201);

        const cart = await api().get('/api/cart').set('Authorization', authHeader(buyer)).expect(200);
        expect(cart.body.data.items).toHaveLength(1);
        expect(cart.body.data.subtotal).toBe(1200);

        const start = await api().post('/api/checkout/start').set('Authorization', authHeader(buyer)).expect(200);
        expect(start.body.data.paymentMethods).toBeTruthy();
        expect(start.body.data.razorpayOrderId).toBeTruthy();
    });

    // ── Phase 5+6: COD golden path ─────────────────────────────────────────────

    test('Phase 5+6 — COD golden path: cart -> place -> accept -> processing -> ship -> deliver', async () => {
        const originalCod = env.enableCodCheckout;
        env.enableCodCheckout = true;

        try {
            const p = await api()
                .post('/api/seller/products')
                .set('Authorization', authHeader(seller))
                .send({
                    title: 'COD Golden Product',
                    description: 'Full COD path',
                    category: 'Textiles',
                    region: 'Rajasthan',
                    price: 750,
                    stock: 5,
                    imageUrls: ['https://example.com/cod.jpg'],
                })
                .expect(201);
            const pid = p.body.data._id;

            await api()
                .post('/api/cart/items')
                .set('Authorization', authHeader(buyer))
                .send({ productId: pid, quantity: 2 })
                .expect(201);

            // checkout/start must include COD when flag is on
            const start = await api().post('/api/checkout/start').set('Authorization', authHeader(buyer)).expect(200);
            expect(start.body.data.paymentMethods).toContain('COD');

            // place COD order
            const placed = await api()
                .post('/api/checkout/place-cod')
                .set('Authorization', authHeader(buyer))
                .send({ paymentMethod: 'COD', shippingInfo })
                .expect(201);

            expect(placed.body.data.paymentStatus).toBe('pending');
            expect(placed.body.data.orderStatus).toBe('awaiting_seller_acceptance');
            const orderId = placed.body.data.orderId;

            // cart must be empty after placement
            const emptyCart = await api().get('/api/cart').set('Authorization', authHeader(buyer)).expect(200);
            expect(emptyCart.body.data.items).toHaveLength(0);

            // stock must be reserved by seller accept (not at placement for COD)
            const beforeAccept = await Product.findById(pid).lean();
            expect(beforeAccept.stock).toBe(5); // stock still intact before accept

            // seller accepts
            const accepted = await api()
                .post(`/api/seller/orders/${orderId}/accept`)
                .set('Authorization', authHeader(seller))
                .send({ message: 'COD in stock' })
                .expect(200);
            expect(accepted.body.data.orderStatus).toBe('confirmed');
            expect(accepted.body.data.paymentMethod).toBe('COD');

            // stock deducted after accept
            const afterAccept = await Product.findById(pid).lean();
            expect(afterAccept.stock).toBe(3);

            // move to processing
            await api()
                .patch(`/api/seller/orders/${orderId}/status`)
                .set('Authorization', authHeader(seller))
                .send({ orderStatus: 'processing' })
                .expect(200);

            // ship
            const shipped = await api()
                .patch(`/api/seller/orders/${orderId}/ship`)
                .set('Authorization', authHeader(seller))
                .send({ trackingNumber: 'E2E-COD-TRACK-001', trackingCarrier: 'QA Courier' })
                .expect(200);
            expect(shipped.body.data.orderStatus).toBe('shipped');

            // deliver
            const delivered = await api()
                .post(`/api/seller/orders/${orderId}/delivered`)
                .set('Authorization', authHeader(seller))
                .expect(200);
            expect(delivered.body.data.orderStatus).toBe('delivered');

            // persisted state: COD order, pending payment, delivered
            const order = await Order.findById(orderId).lean();
            expect(order.paymentMethod).toBe('COD');
            expect(order.paymentStatus).toBe('pending');
            expect(order.orderStatus).toBe('delivered');
            expect(order.razorpayOrderId).toBeFalsy();
            expect(order.razorpayPaymentId).toBeFalsy();
        } finally {
            env.enableCodCheckout = originalCod;
        }
    });

    // ── Phase 5+6: Online Razorpay path regression ─────────────────────────────

    test('Phase 5+6 — Online path: cart -> start -> verify -> accept -> ship -> deliver', async () => {
        const originalManual = env.razorpayManualCaptureEnabled;
        env.razorpayManualCaptureEnabled = true;

        try {
            const p = await api()
                .post('/api/seller/products')
                .set('Authorization', authHeader(seller))
                .send({
                    title: 'Online Golden Product',
                    description: 'Full online path',
                    category: 'Bags',
                    region: 'Rajasthan',
                    price: 900,
                    stock: 4,
                    imageUrls: ['https://example.com/online.jpg'],
                })
                .expect(201);
            const pid = p.body.data._id;

            await api()
                .post('/api/cart/items')
                .set('Authorization', authHeader(buyer))
                .send({ productId: pid, quantity: 1 })
                .expect(201);

            const start = await api().post('/api/checkout/start').set('Authorization', authHeader(buyer)).expect(200);
            const rzpOrderId = start.body.data.razorpayOrderId;
            const rzpOrderAmount = start.body.data.razorpayOrderAmount;
            const rzpPaymentId = 'pay_e2e_online_001';

            razorpay.payments.fetch.mockResolvedValueOnce({
                id: rzpPaymentId,
                order_id: rzpOrderId,
                status: 'authorized',
                amount: rzpOrderAmount, // mirrors what checkout/start returned
                currency: 'INR',
                method: 'UPI',
            });

            const placed = await api()
                .post('/api/checkout/verify')
                .set('Authorization', authHeader(buyer))
                .send({
                    paymentMethod: 'UPI',
                    razorpayOrderId: rzpOrderId,
                    razorpayPaymentId: rzpPaymentId,
                    razorpaySignature: signPayment(rzpOrderId, rzpPaymentId),
                    shippingInfo,
                })
                .expect(201);

            expect(placed.body.data.paymentStatus).toBe('authorized');
            expect(placed.body.data.orderStatus).toBe('awaiting_seller_acceptance');
            const orderId = placed.body.data.orderId;

            // seller accept triggers capture for manual-capture mode
            const accepted = await api()
                .post(`/api/seller/orders/${orderId}/accept`)
                .set('Authorization', authHeader(seller))
                .send({ message: 'Online item ready' })
                .expect(200);
            expect(accepted.body.data.paymentStatus).toBe('paid');

            await api()
                .patch(`/api/seller/orders/${orderId}/status`)
                .set('Authorization', authHeader(seller))
                .send({ orderStatus: 'processing' })
                .expect(200);

            await api()
                .patch(`/api/seller/orders/${orderId}/ship`)
                .set('Authorization', authHeader(seller))
                .send({ trackingNumber: 'E2E-ONLINE-TRACK-001', trackingCarrier: 'QA Courier' })
                .expect(200);

            await api()
                .post(`/api/seller/orders/${orderId}/delivered`)
                .set('Authorization', authHeader(seller))
                .expect(200)
                .expect((res) => expect(res.body.data.orderStatus).toBe('delivered'));

            const order = await Order.findById(orderId).lean();
            expect(order.paymentMethod).toBe('UPI');
            expect(order.paymentStatus).toBe('paid');
            expect(order.orderStatus).toBe('delivered');
        } finally {
            env.razorpayManualCaptureEnabled = originalManual;
        }
    });

    // ── Phase 7: Buyer cancel and return ──────────────────────────────────────

    test('Phase 7 — buyer cancels pre-shipment COD order without triggering a gateway refund', async () => {
        const originalCod = env.enableCodCheckout;
        env.enableCodCheckout = true;

        try {
            const p = await api()
                .post('/api/seller/products')
                .set('Authorization', authHeader(seller))
                .send({
                    title: 'Cancel Phase Product',
                    description: 'Cancel test',
                    category: 'Textiles',
                    region: 'Rajasthan',
                    price: 400,
                    stock: 3,
                    imageUrls: ['https://example.com/cancel.jpg'],
                })
                .expect(201);

            await api()
                .post('/api/cart/items')
                .set('Authorization', authHeader(buyer))
                .send({ productId: p.body.data._id, quantity: 1 })
                .expect(201);

            const placed = await api()
                .post('/api/checkout/place-cod')
                .set('Authorization', authHeader(buyer))
                .send({ paymentMethod: 'COD', shippingInfo })
                .expect(201);

            const orderId = placed.body.data.orderId;

            await api()
                .post(`/api/orders/${orderId}/cancel`)
                .set('Authorization', authHeader(buyer))
                .send({ reason: 'No longer needed' })
                .expect(200)
                .expect((res) => {
                    expect(res.body.data.orderStatus).toBe('cancelled');
                });

            expect(razorpay.payments.refund).not.toHaveBeenCalled();
        } finally {
            env.enableCodCheckout = originalCod;
        }
    });
});
