process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'notwhat-test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CLIENT_URL = '*';
process.env.CLOUDINARY_CLOUD_NAME = 'notwhat-test';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.RAZORPAY_KEY_ID = 'rzp_test_notwhat';
process.env.RAZORPAY_KEY_SECRET = 'razorpay-test-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook-test-secret';
process.env.RAZORPAY_ENABLE_LIVE_REFUNDS = 'false';
process.env.PLATFORM_COMMISSION_PERCENTAGE = '10';
process.env.SHIPROCKET_EMAIL = 'shiprocket@example.com';
process.env.SHIPROCKET_PASSWORD = 'shiprocket-password';
process.env.RESEND_API_KEY = 're_test_notwhat';
process.env.EMAIL_FROM = 'NotWhat <verify@notwhat.test>';
process.env.SIGNUP_OTP_TEST_CODE = '123456';
process.env.SIGNUP_OTP_RESEND_SECONDS = '0';
process.env.PASSWORD_RESET_OTP_TEST_CODE = '654321';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const nock = require('nock');

let mongoServer;

jest.setTimeout(30000);

jest.mock('cloudinary', () => {
  const { PassThrough } = require('stream');

  const upload_stream = jest.fn((_options, callback) => {
    const stream = new PassThrough();
    stream.on('finish', () => callback(null, {
      secure_url: 'https://res.cloudinary.com/notwhat-test/mock-upload.jpg',
      public_id: 'notwhat-test/mock-upload',
      duration: 12,
      eager: [{ secure_url: 'https://res.cloudinary.com/notwhat-test/mock-thumbnail.jpg' }]
    }));
    return stream;
  });

  return {
    v2: {
      config: jest.fn(),
      uploader: { upload_stream }
    }
  };
});

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn(async (payload) => ({
        id: 'order_mock_123',
        amount: payload.amount,
        currency: payload.currency || 'INR',
        status: 'created'
      }))
    },
    payments: {
      fetch: jest.fn(async () => ({ id: 'pay_mock_123', status: 'captured' })),
      capture: jest.fn(async () => ({ id: 'pay_mock_123', status: 'captured' })),
      refund: jest.fn(async () => ({ id: 'rfnd_mock_123', status: 'processed' })),
      transfer: jest.fn(async (_paymentId, payload = {}) => ({
        id: 'trf_mock_123',
        status: 'processed',
        items: (payload.transfers || []).map((transfer, index) => ({
          id: `trf_mock_${index + 1}`,
          amount: transfer.amount,
          currency: transfer.currency || 'INR',
          recipient: transfer.account,
          on_hold: transfer.on_hold
        }))
      }))
    },
    accounts: {
      create: jest.fn(async () => ({ id: 'acc_mock_123' }))
    },
    stakeholders: {
      create: jest.fn(async () => ({ id: 'sth_mock_123' }))
    },
    transfers: {
      edit: jest.fn(async () => ({ id: 'trf_mock_123', on_hold: false }))
    }
  }));
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(async () => ({
      messageId: 'email_mock_123',
      accepted: ['qa@example.com'],
      rejected: []
    }))
  }))
}));

beforeAll(async () => {
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');
  mongoServer = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 30000
    }
  });
  process.env.MONGO_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGO_URI);
});

afterEach(async () => {
  jest.clearAllMocks();
  nock.cleanAll();

  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  nock.enableNetConnect();
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
  }
});
