const { validationResult } = require('express-validator');

const {
    placeCodValidation,
    verifyCheckoutValidation
} = require('../../../../src/modules/checkout/checkout.validation');

const runValidation = async (chains, body) => {
    const req = { body };

    for (const chain of chains) {
        // express-validator mutates req with the validation context.
        await chain.run(req);
    }

    return validationResult(req).array();
};

describe('checkout validation: COD and online branching', () => {
    test('place-cod accepts valid COD payload with shippingInfo', async () => {
        const errors = await runValidation(placeCodValidation, {
            paymentMethod: 'COD',
            shippingInfo: {
                name: 'Buyer QA',
                email: 'buyer@example.com',
                phone: '9999999999',
                address: '123 QA Street',
                city: 'Jaipur',
                state: 'Rajasthan',
                postalCode: '302001'
            }
        });

        expect(errors).toHaveLength(0);
    });

    test('place-cod rejects Razorpay-only fields', async () => {
        const errors = await runValidation(placeCodValidation, {
            paymentMethod: 'COD',
            shippingInfo: {
                name: 'Buyer QA',
                email: 'buyer@example.com',
                phone: '9999999999',
                address: '123 QA Street',
                city: 'Jaipur',
                state: 'Rajasthan',
                postalCode: '302001'
            },
            razorpayOrderId: 'order_not_allowed'
        });

        expect(errors.map((error) => error.msg)).toContain('Razorpay fields are not allowed for COD checkout');
    });

    test('verify rejects COD payment method', async () => {
        const errors = await runValidation(verifyCheckoutValidation, {
            paymentMethod: 'COD',
            shippingInfo: {
                name: 'Buyer QA',
                email: 'buyer@example.com',
                phone: '9999999999',
                address: '123 QA Street',
                city: 'Jaipur',
                state: 'Rajasthan',
                postalCode: '302001'
            },
            razorpayOrderId: 'order_mock_123',
            razorpayPaymentId: 'pay_mock_123',
            razorpaySignature: 'sig_mock_123'
        });

        expect(errors.map((error) => error.msg)).toContain(
            'Payment method must be UPI, card, netbanking, or wallet. For COD use /api/checkout/place-cod'
        );
    });

    test('verify still requires Razorpay fields for online methods', async () => {
        const errors = await runValidation(verifyCheckoutValidation, {
            paymentMethod: 'UPI',
            shippingInfo: {
                name: 'Buyer QA',
                email: 'buyer@example.com',
                phone: '9999999999',
                address: '123 QA Street',
                city: 'Jaipur',
                state: 'Rajasthan',
                postalCode: '302001'
            }
        });

        const messages = errors.map((error) => error.msg);
        expect(messages).toContain('razorpayOrderId is required');
        expect(messages).toContain('razorpayPaymentId is required');
        expect(messages).toContain('razorpaySignature is required');
    });
});
