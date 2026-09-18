const env = require('./env');

const normalizePercentage = (value, fallback = 10) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
    return fallback;
  }

  return numeric;
};

const PLATFORM_COMMISSION_PERCENTAGE = normalizePercentage(env.platformCommissionPercentage, 10);
const PLATFORM_COMMISSION_RATE = PLATFORM_COMMISSION_PERCENTAGE / 100;
const GST_RATE = 0.18;

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const calculateCommission = (subtotal, commissionPercentage = PLATFORM_COMMISSION_PERCENTAGE) => {
  const percentage = normalizePercentage(commissionPercentage, PLATFORM_COMMISSION_PERCENTAGE);
  const commissionRate = percentage / 100;
  const commissionAmount = roundMoney(subtotal * commissionRate);
  const sellerPayoutAmount = Math.round((subtotal - commissionAmount) * 100) / 100;

  return {
    commissionAmount,
    sellerPayoutAmount,
    commissionRate,
    commissionPercentage: percentage
  };
};

const extractGSTFromInclusivePrice = (inclusivePrice) => {
  return Math.round(((inclusivePrice * GST_RATE) / (1 + GST_RATE)) * 100) / 100;
};

module.exports = {
  PLATFORM_COMMISSION_PERCENTAGE,
  PLATFORM_COMMISSION_RATE,
  GST_RATE,
  normalizePercentage,
  roundMoney,
  calculateCommission,
  extractGSTFromInclusivePrice
};
