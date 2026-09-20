process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'notwhat-test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CLIENT_URL = '*';
process.env.CLOUDINARY_CLOUD_NAME = 'notwhat-test';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.ENABLE_COD_CHECKOUT = 'true';
process.env.ENABLE_QR_PAYMENT_CHECKOUT = 'true';
process.env.PLATFORM_COMMISSION_PERCENTAGE = '10';
process.env.SHIPROCKET_EMAIL = 'shiprocket@example.com';
process.env.SHIPROCKET_PASSWORD = 'shiprocket-password';
process.env.RESEND_API_KEY = 're_test_notwhat';
process.env.EMAIL_FROM = 'NotWhat <verify@notwhat.test>';
process.env.SIGNUP_OTP_TEST_CODE = '123456';
process.env.SIGNUP_OTP_RESEND_SECONDS = '0';
process.env.PASSWORD_RESET_OTP_TEST_CODE = '654321';
process.env.UPLOADS_MEDIA_READ_RATE_LIMIT_PER_MINUTE = '3';
process.env.ENABLE_PUSH_NOTIFICATIONS = 'true';
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({ project_id: 'notwhat-test' });

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

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(async () => ({
      messageId: 'email_mock_123',
      accepted: ['qa@example.com'],
      rejected: []
    }))
  }))
}));

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(() => ({})),
  credential: { cert: jest.fn() },
  messaging: jest.fn(() => ({
    sendEachForMulticast: jest.fn(async ({ tokens }) => ({
      successCount: tokens.length,
      responses: tokens.map(() => ({ success: true }))
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
