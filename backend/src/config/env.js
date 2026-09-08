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
  apiPublicBaseUrl: process.env.API_PUBLIC_BASE_URL || '',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/notwhat',
  jwtSecret: process.env.JWT_SECRET || 'notwhat-development-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  awsRegion: process.env.AWS_REGION || '',
  awsS3Bucket: process.env.AWS_S3_BUCKET || '',
  awsS3Endpoint: process.env.AWS_S3_ENDPOINT || '',
  awsS3PublicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL || '',
  awsS3ForcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsAccountId: process.env.AWS_ACCOUNT_ID || '',
  awsMediaConvertEndpoint: process.env.AWS_MEDIACONVERT_ENDPOINT || '',
  awsMediaConvertRoleArn: process.env.AWS_MEDIACONVERT_ROLE_ARN || '',
  enableHLSTranscoding: process.env.ENABLE_HLS_TRANSCODING === 'true',
  uploadsMediaReadRateLimitPerMinute: parseInt(process.env.UPLOADS_MEDIA_READ_RATE_LIMIT_PER_MINUTE || '120', 10),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  razorpayEnableLiveRefunds: process.env.RAZORPAY_ENABLE_LIVE_REFUNDS === 'true',
  razorpayCheckoutEnabled: process.env.RAZORPAY_CHECKOUT_ENABLED === 'true',
  razorpayCaptureAfterSellerAcceptance: process.env.RAZORPAY_CAPTURE_AFTER_SELLER_ACCEPTANCE === 'true',
  razorpayManualCaptureEnabled: process.env.RAZORPAY_MANUAL_CAPTURE_ENABLED === 'true'
    || process.env.RAZORPAY_CAPTURE_AFTER_SELLER_ACCEPTANCE === 'true',
  enableCodCheckout: process.env.ENABLE_COD_CHECKOUT === 'true',
  enableQrPaymentCheckout: process.env.ENABLE_QR_PAYMENT_CHECKOUT !== 'false',
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
  passwordResetOtpTestCode: ['test', 'development'].includes(process.env.NODE_ENV) ? process.env.PASSWORD_RESET_OTP_TEST_CODE || '' : '',
  enablePushNotifications: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true',
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || ''
};
