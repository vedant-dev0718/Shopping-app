require('dotenv').config();

const env = require('../src/config/env');
const shiprocket = require('../src/utils/shiprocket');

const required = (name, value) => {
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
};

const run = async () => {
    required('SHIPROCKET_EMAIL', env.shiprocketEmail);
    required('SHIPROCKET_PASSWORD', env.shiprocketPassword);

    const serviceability = await shiprocket.getServiceability('110001', '400001', 0.5, false);
    if (!serviceability) {
        throw new Error('Shiprocket returned an empty serviceability response');
    }
    console.log('PASS Shiprocket serviceability response received');
    console.log('Shiprocket webhook delivery must be verified separately with a dashboard test event');
};

run().catch((error) => {
    console.error(`FAIL ${error.message}`);
    process.exitCode = 1;
});
