const { api } = require('../helpers/testServer.helper');
const { authHeader, createAdmin, createBuyer, createSeller } = require('../helpers/auth.helper');
const { createProduct } = require('../helpers/mockData.helper');
const { createOrder } = require('../helpers/order.helper');

describe('admin analytics payment method aggregation with COD', () => {
    test('payment-methods includes COD bucket with stable counts and amounts', async () => {
        const admin = await createAdmin();
        const buyer = await createBuyer({ email: 'analytics-cod-buyer@example.com' });
        const seller = await createSeller({ email: 'analytics-cod-seller@example.com' });
        const product = await createProduct(seller, { price: 1000, stock: 5 });

        await createOrder({
            buyer,
            seller,
            product,
            overrides: {
                orderNumber: 'NW-COD-AN-001',
                paymentMethod: 'COD',
                paymentStatus: 'pending',
                finalTotal: 1099,
                subtotal: 1000,
                shipping: 99,
                totalProductAmount: 1000,
                totalShippingAmount: 99,
                orderStatus: 'awaiting_seller_acceptance'
            }
        });

        await createOrder({
            buyer,
            seller,
            product,
            overrides: {
                orderNumber: 'NW-COD-AN-002',
                paymentMethod: 'COD',
                paymentStatus: 'paid',
                finalTotal: 1099,
                subtotal: 1000,
                shipping: 99,
                totalProductAmount: 1000,
                totalShippingAmount: 99,
                orderStatus: 'processing'
            }
        });

        await createOrder({
            buyer,
            seller,
            product,
            overrides: {
                orderNumber: 'NW-COD-AN-003',
                paymentMethod: 'card',
                paymentStatus: 'paid',
                finalTotal: 1099,
                subtotal: 1000,
                shipping: 99,
                totalProductAmount: 1000,
                totalShippingAmount: 99,
                orderStatus: 'processing'
            }
        });

        const response = await api()
            .get('/api/admin/analytics/payment-methods')
            .set('Authorization', authHeader(admin))
            .expect(200);

        const paymentRows = response.body.data;
        const codRow = paymentRows.find((row) => row.method === 'COD');
        const cardRow = paymentRows.find((row) => row.method === 'card');

        expect(codRow).toBeTruthy();
        expect(codRow.count).toBe(2);
        expect(codRow.amount).toBe(1099);
        expect(cardRow).toBeTruthy();
        expect(cardRow.count).toBe(1);
        expect(cardRow.amount).toBe(1099);
    });
});
