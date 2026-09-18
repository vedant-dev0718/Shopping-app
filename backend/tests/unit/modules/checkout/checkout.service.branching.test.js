const checkoutService = require('../../../../src/modules/checkout/checkout.service');
const env = require('../../../../src/config/env');

describe('checkout service branching guards for COD vs online', () => {
    test('verifyAndPlaceOrder rejects COD payment method on online verification path', async () => {
        await expect(
            checkoutService.verifyAndPlaceOrder(
                'order_mock_123',
                'pay_mock_123',
                'signature_mock_123',
                '66aefc38f2f8bc9a4e019999',
                {
                    shippingInfo: {
                        name: 'Buyer QA',
                        email: 'buyer@example.com',
                        phone: '9999999999',
                        address: '123 QA Street',
                        city: 'Jaipur',
                        state: 'Rajasthan',
                        postalCode: '302001'
                    }
                },
                'COD'
            )
        ).rejects.toMatchObject({
            statusCode: 400,
            message: 'COD is not allowed on /checkout/verify. Use /checkout/place-cod'
        });
    });

    test('placeCodOrder rejects when COD feature flag is disabled', async () => {
        const originalCodFlag = env.enableCodCheckout;
        env.enableCodCheckout = false;

        try {
            await expect(
                checkoutService.placeCodOrder(
                    '66aefc38f2f8bc9a4e019999',
                    {
                        shippingInfo: {
                            name: 'Buyer QA',
                            email: 'buyer@example.com',
                            phone: '9999999999',
                            address: '123 QA Street',
                            city: 'Jaipur',
                            state: 'Rajasthan',
                            postalCode: '302001'
                        }
                    },
                    'COD'
                )
            ).rejects.toMatchObject({
                statusCode: 400,
                message: 'Cash on Delivery is currently unavailable'
            });
        } finally {
            env.enableCodCheckout = originalCodFlag;
        }
    });

    test('placeCodOrder rejects non-COD payment methods even when feature flag is enabled', async () => {
        const originalCodFlag = env.enableCodCheckout;
        env.enableCodCheckout = true;

        try {
            await expect(
                checkoutService.placeCodOrder(
                    '66aefc38f2f8bc9a4e019999',
                    {
                        shippingInfo: {
                            name: 'Buyer QA',
                            email: 'buyer@example.com',
                            phone: '9999999999',
                            address: '123 QA Street',
                            city: 'Jaipur',
                            state: 'Rajasthan',
                            postalCode: '302001'
                        }
                    },
                    'UPI'
                )
            ).rejects.toMatchObject({
                statusCode: 400,
                message: 'paymentMethod must be COD for this endpoint'
            });
        } finally {
            env.enableCodCheckout = originalCodFlag;
        }
    });
});
