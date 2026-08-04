const Order = require('../../src/modules/orders/order.model');
const Refund = require('../../src/modules/refunds/refund.model');
const { razorpay } = require('../../src/utils/razorpay');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createAdmin, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');

describe('COD cancellation and refund gateway safety', () => {
    test('buyer cancellation for COD does not trigger Razorpay refund', async () => {
        const buyer = await createBuyer({ email: 'cod-cancel-buyer@example.com' });
        const seller = await createSeller({ email: 'cod-cancel-seller@example.com' });
        const product = await createProduct(seller, { stock: 5, price: 799 });

        const order = await createOrder({
            buyer,
            seller,
            product,
            overrides: {
                paymentMethod: 'COD',
                paymentStatus: 'pending',
                orderStatus: 'awaiting_seller_acceptance',
                itemStatus: 'awaiting_seller_acceptance',
                itemAcceptanceStatus: 'pending'
            }
        });

        await api()
            .post(`/api/orders/${order._id}/cancel`)
            .set('Authorization', authHeader(buyer))
            .send({ reason: 'Changed my mind before dispatch' })
            .expect(200)
            .expect((res) => {
                expect(res.body.data.orderStatus).toBe('cancelled');
            });

        const [updatedOrder, refundCount] = await Promise.all([
            Order.findById(order._id).lean(),
            Refund.countDocuments({ orderId: order._id })
        ]);

        expect(updatedOrder.paymentMethod).toBe('COD');
        expect(updatedOrder.paymentStatus).toBe('pending');
        expect(updatedOrder.refundStatus).toBe('none');
        expect(refundCount).toBe(0);
        expect(razorpay.payments.refund).not.toHaveBeenCalled();
    });

    test('seller rejection for COD does not trigger Razorpay refund', async () => {
        const buyer = await createBuyer({ email: 'cod-reject-buyer@example.com' });
        const seller = await createSeller({ email: 'cod-reject-seller@example.com' });
        const product = await createProduct(seller, { stock: 3, price: 899 });

        const order = await createOrder({
            buyer,
            seller,
            product,
            overrides: {
                paymentMethod: 'COD',
                paymentStatus: 'pending',
                orderStatus: 'awaiting_seller_acceptance',
                itemStatus: 'awaiting_seller_acceptance',
                itemAcceptanceStatus: 'pending'
            }
        });

        await api()
            .post(`/api/seller/orders/${order._id}/reject`)
            .set('Authorization', authHeader(seller))
            .send({
                reason: 'Product unavailable',
                messageToBuyer: 'This COD item is unavailable, please try another product.'
            })
            .expect(200)
            .expect((res) => {
                expect(res.body.data.orderStatus).toBe('cancelled_unavailable');
            });

        const [updatedOrder, refundCount] = await Promise.all([
            Order.findById(order._id).lean(),
            Refund.countDocuments({ orderId: order._id })
        ]);

        expect(updatedOrder.paymentMethod).toBe('COD');
        expect(updatedOrder.paymentStatus).toBe('pending');
        expect(updatedOrder.refundStatus).toBe('none');
        expect(refundCount).toBe(0);
        expect(razorpay.payments.refund).not.toHaveBeenCalled();
    });

    test('admin refund attempt on COD order is rejected before any gateway call', async () => {
        const admin = await createAdmin({ email: 'cod-refund-admin@example.com' });
        const buyer = await createBuyer({ email: 'cod-refund-buyer@example.com' });
        const seller = await createSeller({ email: 'cod-refund-seller@example.com' });
        const product = await createProduct(seller, { stock: 4, price: 649 });

        const order = await createOrder({
            buyer,
            seller,
            product,
            overrides: {
                paymentMethod: 'COD',
                paymentStatus: 'pending',
                orderStatus: 'cancelled'
            }
        });

        await api()
            .post(`/api/orders/${order._id}/refund`)
            .set('Authorization', authHeader(admin))
            .send({ amount: order.finalTotal, reason: 'Manual COD refund request' })
            .expect(400)
            .expect((res) => {
                expect(res.body.message).toBe('Razorpay payment ID not found for this order');
            });

        expect(razorpay.payments.refund).not.toHaveBeenCalled();
    });
});