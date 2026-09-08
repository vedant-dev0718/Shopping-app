require('dotenv').config();

const env = require('../src/config/env');
const { razorpay } = require('../src/utils/razorpay');
const shiprocket = require('../src/utils/shiprocket');

const required = (name, value) => {
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
};

const run = async () => {
    required('RAZORPAY_KEY_ID', env.razorpayKeyId);
    required('RAZORPAY_KEY_SECRET', env.razorpayKeySecret);
    required('SHIPROCKET_EMAIL', env.shiprocketEmail);
    required('SHIPROCKET_PASSWORD', env.shiprocketPassword);

    const razorpayOrder = await razorpay.orders.create({
        amount: 100,
        currency: 'INR',
        receipt: `demo_${Date.now()}`,
        notes: { purpose: 'NotWhat integration smoke test' }
    });
    if (!razorpayOrder?.id) {
        throw new Error('Razorpay did not return an order id');
    }
    console.log(`PASS Razorpay test order: ${razorpayOrder.id}`);

    const serviceability = await shiprocket.getServiceability('110001', '400001', 0.5, false);
    if (!serviceability) {
        throw new Error('Shiprocket returned an empty serviceability response');
    }
    console.log('PASS Shiprocket serviceability response received');
    console.log('PASS Webhook endpoints must be verified separately with dashboard test events');
};

run().catch((error) => {
    console.error(`FAIL ${error.message}`);
    process.exitCode = 1;
});
