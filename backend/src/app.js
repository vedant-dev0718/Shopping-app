const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const env = require('./config/env');
const routes = require('./routes');
const AppError = require('./utils/AppError');
const errorMiddleware = require('./middleware/error.middleware');
const { handleRazorpayWebhook } = require('./modules/checkout/webhook.controller');
const { handleShiprocketWebhook } = require('./modules/shipping/shiprocketWebhook.controller');
const { runBargainAutoClose } = require('./jobs/bargainAutoClose.job');
const { runAutoDelivery } = require('./jobs/autoDelivery.job');
const { runEarningsEligibility } = require('./jobs/earningsEligibility.job');

const app = express();

// Behind the nginx reverse proxy every request arrives from 127.0.0.1, which
// would collapse the rate limiters below into a single shared bucket. Trust
// exactly one hop so a client cannot spoof its own X-Forwarded-For.
app.set('trust proxy', 1);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === 'test' ? 1000 : 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === 'test' ? 2000 : 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (env.clientUrls.includes('*') || !origin || env.clientUrls.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new AppError('Not allowed by CORS', 403));
  },
  credentials: true
}));
app.post('/webhooks/razorpay', express.raw({ type: 'application/json' }), handleRazorpayWebhook);
app.post('/webhooks/shiprocket', express.raw({ type: 'application/json' }), handleShiprocketWebhook);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
  const bargainAutoCloseInterval = setInterval(() => {
    runBargainAutoClose().catch((error) => {
      console.error('Bargain auto-close job failed:', error.message);
    });
  }, 300000);

  // Flag shipped orders for delivery review when courier webhooks do not arrive
  const autoDeliveryInterval = setInterval(() => {
    runAutoDelivery().catch((error) => {
      console.error('Auto-delivery job failed:', error.message);
    });
  }, 6 * 60 * 60 * 1000);

  // Release seller earnings and Razorpay transfer holds once the return window has closed
  const earningsEligibilityInterval = setInterval(() => {
    runEarningsEligibility().catch((error) => {
      console.error('Earnings eligibility job failed:', error.message);
    });
  }, 60 * 60 * 1000);

  bargainAutoCloseInterval.unref();
  autoDeliveryInterval.unref();
  earningsEligibilityInterval.unref();
}

app.get('/', (_req, res) => {
  res.send('NotWhat API is running');
});

app.use('/api/auth', authLimiter);
app.use('/api/contact', writeLimiter);
app.use('/api/uploads', writeLimiter);
app.use('/api', routes);

app.use((_req, _res, next) => {
  next(new AppError('Route not found', 404));
});

app.use(errorMiddleware);

module.exports = app;
