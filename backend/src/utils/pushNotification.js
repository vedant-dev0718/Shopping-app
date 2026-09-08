const admin = require('firebase-admin');

const env = require('../config/env');

let firebaseApp = null;
let initAttempted = false;

// Lazily initialize so tests/dev without Firebase creds never crash the process.
const getFirebaseApp = () => {
  if (firebaseApp || initAttempted) {
    return firebaseApp;
  }

  initAttempted = true;

  if (!env.enablePushNotifications || !env.firebaseServiceAccountJson) {
    console.warn('[push] Push notifications disabled (FIREBASE_SERVICE_ACCOUNT_JSON not set)');
    return null;
  }

  try {
    const credentials = JSON.parse(env.firebaseServiceAccountJson);
    firebaseApp = admin.initializeApp({ credential: admin.credential.cert(credentials) });
  } catch (error) {
    console.error('[push] Failed to initialize Firebase Admin SDK:', error.message);
    firebaseApp = null;
  }

  return firebaseApp;
};

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token'
]);

/**
 * Sends a title/subtitle push to a batch of FCM tokens via APNs (iOS) and FCM (Android).
 * Returns invalidTokens so callers can prune stale device tokens.
 */
const sendMulticast = async (tokens, { title, subtitle = '', data = {} }) => {
  const app = getFirebaseApp();

  if (!app || !tokens || tokens.length === 0) {
    return { successCount: 0, invalidTokens: [] };
  }

  const response = await admin.messaging(app).sendEachForMulticast({
    tokens,
    notification: { title, body: subtitle },
    apns: {
      payload: {
        aps: { alert: { title, subtitle } }
      }
    },
    data
  });

  const invalidTokens = [];

  response.responses.forEach((result, index) => {
    if (!result.success && INVALID_TOKEN_ERROR_CODES.has(result.error?.code)) {
      invalidTokens.push(tokens[index]);
    }
  });

  return { successCount: response.successCount, invalidTokens };
};

module.exports = {
  sendMulticast
};
