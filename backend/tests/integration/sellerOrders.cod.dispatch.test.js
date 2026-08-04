const Order = require('../../src/modules/orders/order.model');
const { api } = require('../helpers/testServer.helper');
const { authHeader, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');

describe('seller COD dispatch progression', () => {
    test('COD order progresses accept -> processing -> shipped -> delivered', async () => {
        const buyer = await createBuyer({ email: 'cod-dispatch-buyer@example.com' });
        const seller = await createSeller({ email: 'cod-dispatch-seller@example.com' });
        const product = await createProduct(seller, { stock: 3, price: 699 });

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

        const accepted = await api()
            .post(`/api/seller/orders/${order._id}/accept`)
            .set('Authorization', authHeader(seller))
            .send({ message: 'COD item in stock' })
            .expect(200);

        expect(accepted.body.data.paymentMethod).toBe('COD');
        expect(accepted.body.data.orderStatus).toBe('confirmed');

        await api()
            .patch(`/api/seller/orders/${order._id}/status`)
            .set('Authorization', authHeader(seller))
            .send({ orderStatus: 'processing' })
            .expect(200);

        await api()
            .patch(`/api/seller/orders/${order._id}/ship`)
            .set('Authorization', authHeader(seller))
            .send({
                trackingNumber: 'COD-TRACK-1001',
                trackingCarrier: 'QA Courier',
                trackingUrl: 'https://tracking.example/COD-TRACK-1001'
            })
            .expect(200)
            .expect((res) => {
                expect(res.body.data.orderStatus).toBe('shipped');
            });

        await api()
            .post(`/api/seller/orders/${order._id}/delivered`)
            .set('Authorization', authHeader(seller))
            .expect(200)
            .expect((res) => {
                expect(res.body.data.orderStatus).toBe('delivered');
            });

        const updated = await Order.findById(order._id).lean();
        expect(updated.paymentMethod).toBe('COD');
        expect(updated.orderStatus).toBe('delivered');
        expect(updated.paymentStatus).toBe('pending');
    });

    test('COD order cannot be marked delivered before it is shipped', async () => {
        const buyer = await createBuyer({ email: 'cod-delivery-rule-buyer@example.com' });
        const seller = await createSeller({ email: 'cod-delivery-rule-seller@example.com' });
        const product = await createProduct(seller, { stock: 2, price: 499 });

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
            .post(`/api/seller/orders/${order._id}/accept`)
            .set('Authorization', authHeader(seller))
            .send({ message: 'Accepted' })
            .expect(200);

        await api()
            .post(`/api/seller/orders/${order._id}/delivered`)
            .set('Authorization', authHeader(seller))
            .expect(400);
    });

    test('COD order cannot be shipped before seller acceptance with explicit error', async () => {
        const buyer = await createBuyer({ email: 'cod-ship-before-accept-buyer@example.com' });
        const seller = await createSeller({ email: 'cod-ship-before-accept-seller@example.com' });
        const product = await createProduct(seller, { stock: 2, price: 599 });

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
            .patch(`/api/seller/orders/${order._id}/ship`)
            .set('Authorization', authHeader(seller))
            .send({
                trackingNumber: 'COD-PRE-ACCEPT-1001',
                trackingCarrier: 'QA Courier'
            })
            .expect(400)
            .expect((res) => {
                expect(res.body.message).toBe('Accept this order before marking it shipped');
            });
    });
});
