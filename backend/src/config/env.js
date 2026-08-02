const dotenv = require('dotenv');

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const requiredProductionEnv = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL'];
const missingRequiredEnv = requiredProductionEnv.filter((key) => !process.env[key]);

if (isProduction && missingRequiredEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingRequiredEnv.join(', ')}`);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5001,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/notwhat',
  jwtSecret: process.env.JWT_SECRET || 'notwhat-development-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  razorpayEnableLiveRefunds: process.env.RAZORPAY_ENABLE_LIVE_REFUNDS === 'true',
  razorpayCaptureAfterSellerAcceptance: process.env.RAZORPAY_CAPTURE_AFTER_SELLER_ACCEPTANCE === 'true',
  razorpayManualCaptureEnabled: process.env.RAZORPAY_MANUAL_CAPTURE_ENABLED === 'true'
    || process.env.RAZORPAY_CAPTURE_AFTER_SELLER_ACCEPTANCE === 'true',
  razorpayAuthorizationTimeoutMinutes: parseInt(process.env.RAZORPAY_AUTHORIZATION_TIMEOUT_MINUTES || '240', 10),
  googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID || '',
  googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
  appleBundleId: process.env.APPLE_BUNDLE_ID || 'com.notwhat.app',
  sellerAcceptanceWindowMinutes: parseInt(process.env.SELLER_ACCEPTANCE_WINDOW_MINUTES || '240', 10),
  bidAcceptanceWindowMinutes: parseInt(process.env.BID_ACCEPTANCE_WINDOW_MINUTES || '240', 10),
  shiprocketEnableLivePickupSync: process.env.SHIPROCKET_ENABLE_LIVE_PICKUP_SYNC === 'true',
  shiprocketEmail: process.env.SHIPROCKET_EMAIL || '',
  shiprocketPassword: process.env.SHIPROCKET_PASSWORD || '',
  shiprocketWebhookSecret: process.env.SHIPROCKET_WEBHOOK_SECRET || '',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@notwhat.com',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminName: process.env.ADMIN_NAME || 'NotWhat Admin',
  adminOverwritePassword: process.env.ADMIN_OVERWRITE_PASSWORD === 'true',
  adminTotpSecret: process.env.ADMIN_TOTP_SECRET || '',
  platformCommissionPercentage: parseFloat(process.env.PLATFORM_COMMISSION_PERCENTAGE || '10'),
  emailHost: process.env.EMAIL_HOST,
  emailPort: parseInt(process.env.EMAIL_PORT || '587', 10),
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,
  emailFrom: process.env.EMAIL_FROM || 'NotWhat <noreply@notwhat.in>',
  resendApiKey: process.env.RESEND_API_KEY || '',
  signupOtpTtlMinutes: parseInt(process.env.SIGNUP_OTP_TTL_MINUTES || '10', 10),
  signupOtpResendSeconds: parseInt(process.env.SIGNUP_OTP_RESEND_SECONDS || '60', 10),
  signupOtpMaxAttempts: parseInt(process.env.SIGNUP_OTP_MAX_ATTEMPTS || '5', 10),
  signupOtpMaxSends: parseInt(process.env.SIGNUP_OTP_MAX_SENDS || '5', 10),
  signupOtpTestCode: ['test', 'development'].includes(process.env.NODE_ENV) ? process.env.SIGNUP_OTP_TEST_CODE || '' : '',
  passwordResetOtpTestCode: ['test', 'development'].includes(process.env.NODE_ENV) ? process.env.PASSWORD_RESET_OTP_TEST_CODE || '' : ''
};
