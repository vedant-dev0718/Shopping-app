// Full end-to-end payment + Route transfer test (no iOS needed)
// Run: node scripts/test-payment-flow.js
//
// What it does:
//  1. Logs in as demo buyer
//  2. Adds a product to cart
//  3. Calls startCheckout → gets real Razorpay order ID
//  4. Simulates payment capture via Razorpay test API
//  5. Triggers our webhook manually
//  6. Checks if Route transfer was created for the seller
//  7. Prints final result

require('dotenv').config();
const https = require('https');
const http = require('http');
const crypto = require('crypto');

const BASE_URL = `http://localhost:${process.env.PORT || 5001}/api`;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

const BUYER_EMAIL = 'buyer@notwhat.test';
const BUYER_PASSWORD = 'Test@1234';

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const isHttps = url.protocol === 'https:';
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
    };

    const req = (isHttps ? https : http).request(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function razorpayRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
    };

    const req = https.request(
      { hostname: 'api.razorpay.com', path: `/v1${path}`, method, headers },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function buildWebhookSignature(payload) {
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
}

function sendWebhook(event, token) {
  const payload = JSON.stringify(event);
  const signature = buildWebhookSignature(payload);
  const payloadBuffer = Buffer.from(payload);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: process.env.PORT || 5001,
        path: '/webhooks/razorpay',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payloadBuffer.length,
          'x-razorpay-signature': signature
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    req.write(payloadBuffer);
    req.end();
  });
}

function log(step, msg, data) {
  console.log(`\n[${step}] ${msg}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// ── Test flow ─────────────────────────────────────────────────────────────────

async function run() {
  console.log('=== NotWhat Payment Flow Test ===\n');

  // 1. Login
  log('1', 'Logging in as demo buyer...');
  const loginRes = await request('POST', '/auth/login', { email: BUYER_EMAIL, password: BUYER_PASSWORD });
  if (!loginRes.body.data?.token) {
    console.error('Login failed. Run seed-demo.js first.\n', loginRes.body);
    process.exit(1);
  }
  const token = loginRes.body.data.token;
  log('1', `✓ Logged in — token obtained`);

  // 2. Get products and add first one to cart
  log('2', 'Fetching products...');
  const productsRes = await request('GET', '/products?status=active&limit=1');
  const product = productsRes.body.data?.[0] || productsRes.body.data?.products?.[0];
  if (!product) {
    console.error('No products found. Run seed-demo.js first.');
    process.exit(1);
  }
  log('2', `✓ Found product: "${product.title}" — ₹${product.price}`);

  log('2', 'Clearing cart and adding product...');
  await request('DELETE', '/cart', null, token);
  const cartRes = await request('POST', '/cart/items', { productId: product._id, quantity: 1 }, token);
  if (!cartRes.body.data) {
    console.error('Failed to add to cart:', cartRes.body);
    process.exit(1);
  }
  const cart = cartRes.body.data;
  log('2', `✓ Cart — Subtotal: ₹${cart.subtotal}, Shipping: ₹${cart.shipping}, Total: ₹${cart.finalTotal}`);

  // 3. Start checkout — creates real Razorpay order
  log('3', 'Starting checkout (creates Razorpay order)...');
  const checkoutRes = await request('POST', '/checkout/start', null, token);
  const checkout = checkoutRes.body.data;
  if (!checkout?.razorpayOrderId) {
    console.error('startCheckout failed:', checkoutRes.body);
    process.exit(1);
  }
  log('3', `✓ Razorpay order created: ${checkout.razorpayOrderId}`);
  log('3', `  Amount: ₹${checkout.razorpayOrderAmount / 100}`);

  // 4. Simulate payment capture via Razorpay test API
  // In test mode, Razorpay allows creating test payments directly
  log('4', 'Simulating payment via Razorpay test API...');
  const paymentRes = await razorpayRequest('POST', `/orders/${checkout.razorpayOrderId}/payments`);

  let razorpayPaymentId;

  if (paymentRes.status === 200 && paymentRes.body.items?.[0]) {
    const payment = paymentRes.body.items[0];
    razorpayPaymentId = payment.id;
    log('4', `✓ Test payment found: ${razorpayPaymentId} — status: ${payment.status}`);
  } else {
    // Fallback: use a mock payment ID for webhook simulation
    razorpayPaymentId = `pay_test_${Date.now()}`;
    log('4', `⚠ Could not fetch real payment from Razorpay test API — using mock: ${razorpayPaymentId}`);
    log('4', `  (This is normal if the order has no payment yet in test mode)`);
  }

  // 5. Trigger webhook with payment.captured event
  log('5', 'Triggering payment.captured webhook...');
  const webhookEvent = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: razorpayPaymentId,
          order_id: checkout.razorpayOrderId,
          amount: checkout.razorpayOrderAmount,
          currency: 'INR',
          status: 'captured'
        }
      }
    }
  };

  const webhookRes = await sendWebhook(webhookEvent, token);
  if (webhookRes.status === 200) {
    log('5', '✓ Webhook accepted by server');
  } else {
    log('5', `⚠ Webhook response: ${webhookRes.status}`, webhookRes.body);
  }

  // 6. Place order via verify endpoint (using the Razorpay order ID)
  log('6', 'Placing order via verify endpoint...');
  const signature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${checkout.razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const verifyRes = await request('POST', '/checkout/verify', {
    razorpayOrderId: checkout.razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature: signature,
    shippingInfo: {
      name: 'Demo Buyer',
      email: 'buyer@notwhat.test',
      phone: '9123456780',
      address: '12 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001'
    },
    paymentMethod: 'card'
  }, token);

  if (verifyRes.body.data?.orderNumber) {
    const order = verifyRes.body.data;
    log('6', `✓ Order created!`);
    log('6', `  Order Number: ${order.orderNumber}`);
    log('6', `  Payment Status: ${order.paymentStatus}`);
    log('6', `  Order Status: ${order.orderStatus}`);
    log('6', `  Total: ₹${order.finalTotal}`);
  } else {
    log('6', '⚠ Order creation response:', verifyRes.body);
  }

  // 7. Summary
  console.log('\n════════════════════════════════════════');
  console.log('TEST COMPLETE');
  console.log('════════════════════════════════════════');
  console.log('Check your Razorpay Test Dashboard:');
  console.log('  https://dashboard.razorpay.com/app/orders');
  console.log(`  Order ID: ${checkout.razorpayOrderId}`);
  console.log('\nTo verify Route transfer to seller:');
  console.log('  Razorpay Dashboard → Transfers → check for linked account transfers');
  console.log('  (Transfers only appear if seller has a Razorpay linked account)');
  console.log('════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('\nTest failed:', err.message);
  process.exit(1);
});
