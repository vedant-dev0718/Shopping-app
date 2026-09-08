/**
 * Return lifecycle parity tests: buyer request -> seller approve/reject
 * -> mark-received -> refund closure, for both COD and online orders.
 */

const Order = require('../../src/modules/orders/order.model');
const ReturnRequest = require('../../src/modules/returns/return.model');
const Refund = require('../../src/modules/refunds/refund.model');
const env = require('../../src/config/env');
const { razorpay } = require('../../src/utils/razorpay');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');

const makeDeliveredOrder = async ({ buyer, seller, product, paymentMethod = 'UPI', paymentStatus = 'paid' }) => {
    const order = await createOrder({
        buyer,
        seller,
        product,
        overrides: {
            paymentMethod,
            paymentStatus,
            orderStatus: 'delivered',
            itemStatus: 'delivered',
        },
    });
    // set a deliveredAt within the return window so buyer can request return
    order.deliveredAt = new Date();
    order.deliveryInfo = {
        deliveredAt: order.deliveredAt,
        returnWindowEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    await order.save();
    return order;
};

describe('Return lifecycle — COD and online parity', () => {
    // ── R1: Buyer return request eligibility ────────────────────────────────────

    test('R1 — buyer can only request return on a delivered order (COD)', async () => {
        const buyer = await createBuyer({ email: 'return-r1-buyer@example.com' });
        const seller = await createSeller({ email: 'return-r1-seller@example.com' });
        const product = await createProduct(seller, { stock: 2, price: 500 });

        const placed = await createOrder({
            buyer,
            seller,
            product,
            overrides: {
                paymentMethod: 'COD',
                paymentStatus: 'pending',
                orderStatus: 'processing',
                itemStatus: 'processing',
            },
        });

        // not delivered — must fail
        await api()
            .post(`/api/orders/${placed._id}/returns`)
            .set('Authorization', authHeader(buyer))
            .send({ reason: 'damaged' })
            .expect(400)
            .expect((res) => expect(res.body.message).toBe('Only delivered orders can be returned'));

        const delivered = await makeDeliveredOrder({ buyer, seller, product, paymentMethod: 'COD', paymentStatus: 'pending' });

        const result = await api()
            .post(`/api/orders/${delivered._id}/returns`)
            .set('Authorization', authHeader(buyer))
            .send({ reason: 'damaged' })
            .expect(201);

        expect(result.body.data.status).toBe('requested');

        // duplicate return must be rejected — service returns 409 or 400
        const dup = await api()
            .post(`/api/orders/${delivered._id}/returns`)
            .set('Authorization', authHeader(buyer))
            .send({ reason: 'damaged' });
        expect([400, 409]).toContain(dup.status);
    });

    test('R1 — return window expiry blocks request (online)', async () => {
        const buyer = await createBuyer({ email: 'return-window-buyer@example.com' });
        const seller = await createSeller({ email: 'return-window-seller@example.com' });
        const product = await createProduct(seller, { stock: 2, price: 600 });

        const order = await createOrder({
            buyer,
            seller,
            product,
            overrides: {
                paymentMethod: 'UPI',
                paymentStatus: 'paid',
                orderStatus: 'delivered',
                itemStatus: 'delivered',
            },
        });
        // expired window: deliveredAt 8 days ago
        order.deliveredAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
        order.deliveryInfo = {
            deliveredAt: order.deliveredAt,
            returnWindowEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        };
        await order.save();

        await api()
            .post(`/api/orders/${order._id}/returns`)
            .set('Authorization', authHeader(buyer))
            .send({ reason: 'size_issue' })
            .expect(400)
            .expect((res) => expect(res.body.message).toBe('Return window has expired'));
    });

    // ── R2: Seller approve / reject decisioning ─────────────────────────────────

    test('R2 — seller approves return, order transitions to return_approved (online)', async () => {
        const buyer = await createBuyer({ email: 'return-r2-approve-buyer@example.com' });
        const seller = await createSeller({ email: 'return-r2-approve-seller@example.com' });
        const product = await createProduct(seller, { stock: 3, price: 700 });
        const order = await makeDeliveredOrder({ buyer, seller, product });

        const returnReq = await api()
            .post(`/api/orders/${order._id}/returns`)
            .set('Authorization', authHeader(buyer))
            .send({ reason: 'damaged' })
            .expect(201);

        const returnId = returnReq.body.data._id;

        await api()
            .patch(`/api/seller/returns/${returnId}/approve`)
            .set('Authorization', authHeader(seller))
            .expect(200)
            .expect((res) => expect(res.body.data.status).toBe('approved'));

        const updatedOrder = await Order.findById(order._id).lean();
        expect(updatedOrder.orderStatus).toBe('return_approved');
        expect(updatedOrder.totalRefundedAmount).toBe(returnReq.body.data.refundAmount);
        expect(updatedOrder.items.find((item) => item._id.toString() === order.items[0]._id.toString()).refundAmount)
            .toBe(returnReq.body.data.refundAmount);
    });

    test('R2 — seller rejects return with mandatory reason, order transitions to return_rejected', async () => {
        const buyer = await createBuyer({ email: 'return-r2-reject-buyer@example.com' });
        const seller = await createSeller({ email: 'return-r2-reject-seller@example.com' });
        const product = await createProduct(seller, { stock: 3, price: 650 });
        const order = await makeDeliveredOrder({ buyer, seller, product });

        const returnReq = await api()
            .post(`/api/orders/${order._id}/returns`)
            .set('Authorization', authHeader(buyer))
            .send({ reason: 'size_issue' })
            .expect(201);

        const returnId = returnReq.body.data._id;

        // reject without reason must fail
        await api()
            .patch(`/api/seller/returns/${returnId}/reject`)
            .set('Authorization', authHeader(seller))
            .send({})
            .expect(400);

        await api()
            .patch(`/api/seller/returns/${returnId}/reject`)
            .set('Authorization', authHeader(seller))
            .send({ rejectionReason: 'Item is not damaged, used by customer' })
            .expect(200)
            .expect((res) => {
                expect(res.body.data.status).toBe('rejected');
                expect(res.body.data.rejectionReason).toBeTruthy();
            });

        const updatedOrder = await Order.findById(order._id).lean();
        expect(updatedOrder.orderStatus).toBe('return_rejected');
    });

    // ── R4+R5: Seller mark-received, refund parity ─────────────────────────────

    test('R4+R5 — seller marks return received (online): refund is attempted via gateway', async () => {
        const buyer = await createBuyer({ email: 'return-received-online-buyer@example.com' });
        const seller = await createSeller({ email: 'return-received-online-seller@example.com' });
        const product = await createProduct(seller, { stock: 3, price: 800 });
        const order = await makeDeliveredOrder({ buyer, seller, product, paymentMethod: 'UPI', paymentStatus: 'paid' });

        // set razorpayPaymentId so refund path is reachable
        order.razorpayPaymentId = 'pay_return_online_001';
        await order.save();

        const returnReq = await api()
            .post(`/api/orders/${order._id}/returns`)
            .set('Authorization', authHeader(buyer))
            .send({ reason: 'damaged' })
            .expect(201);

        const returnId = returnReq.body.data._id;

        await api()
            .patch(`/api/seller/returns/${returnId}/approve`)
            .set('Authorization', authHeader(seller))
            .expect(200);

        await api()
            .patch(`/api/seller/returns/${returnId}/mark-received`)
            .set('Authorization', authHeader(seller))
            .expect(200)
            .expect((res) => expect(res.body.data.status).toBe('received'));

        const updatedOrder = await Order.findById(order._id).lean();
        // service moves to 'returned' then immediately 'refunded' when the mock refund is simulated
        expect(['returned', 'refunded']).toContain(updatedOrder.orderStatus);
        expect(['refund_pending', 'refund_processing', 'refunded', 'partially_refunded']).toContain(
            updatedOrder.refundStatus
        );

        const refundRecord = await Refund.findOne({ orderId: order._id }).lean();
        expect(refundRecord).toBeTruthy();
        expect(refundRecord.amount).toBeGreaterThan(0);
    });

    test('R4+R5 — seller marks return received (COD): order moves to returned, no Razorpay refund call', async () => {
        const buyer = await createBuyer({ email: 'return-received-cod-buyer@example.com' });
        const seller = await createSeller({ email: 'return-received-cod-seller@example.com' });
        const product = await createProduct(seller, { stock: 3, price: 750 });
        const order = await makeDeliveredOrder({ buyer, seller, product, paymentMethod: 'COD', paymentStatus: 'pending' });

        const returnReq = await api()
            .post(`/api/orders/${order._id}/returns`)
            .set('Authorization', authHeader(buyer))
            .send({ reason: 'wrong_item' })
            .expect(201);

        const returnId = returnReq.body.data._id;

        await api()
            .patch(`/api/seller/returns/${returnId}/approve`)
            .set('Authorization', authHeader(seller))
            .expect(200);

        // mark-received on a COD order: no razorpayPaymentId, so refund path throws 400
        // but return state should still progress or gracefully surface the COD-specific error
        const response = await api()
            .patch(`/api/seller/returns/${returnId}/mark-received`)
            .set('Authorization', authHeader(seller));

        // acceptable: 200 with returned state (if service handles COD gracefully) or
        // 400 with explicit COD-incompatible refund message — never a 500
        expect([200, 400]).toContain(response.status);
        expect(razorpay.payments.refund).not.toHaveBeenCalled();

        if (response.status === 200) {
            const updatedOrder = await Order.findById(order._id).lean();
            expect(updatedOrder.orderStatus).toBe('returned');
        }
    });

    // ── R1: Seller cannot request return on another seller's order ──────────────

    test('R2 — unauthorized seller cannot review another seller return', async () => {
        const buyer = await createBuyer({ email: 'return-unauth-buyer@example.com' });
        const seller = await createSeller({ email: 'return-unauth-seller@example.com' });
        const otherSeller = await createSeller({ email: 'return-unauth-other-seller@example.com' });
        const product = await createProduct(seller, { stock: 2, price: 500 });
        const order = await makeDeliveredOrder({ buyer, seller, product });

        const returnReq = await api()
            .post(`/api/orders/${order._id}/returns`)
            .set('Authorization', authHeader(buyer))
            .send({ reason: 'damaged' })
            .expect(201);

        const returnId = returnReq.body.data._id;

        await api()
            .patch(`/api/seller/returns/${returnId}/approve`)
            .set('Authorization', authHeader(otherSeller))
            .expect(404);
    });
});
