const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

const normalizeBase32 = (value = '') => String(value)
  .replace(/\s+/g, '')
  .replace(/=+$/g, '')
  .toUpperCase();

const decodeBase32 = (secret) => {
  const normalized = normalizeBase32(secret);
  let bits = '';

  for (const char of normalized) {
    const value = BASE32_ALPHABET.indexOf(char);

    if (value === -1) {
      throw new Error('Invalid TOTP secret');
    }

    bits += value.toString(2).padStart(5, '0');
  }

  const bytes = [];

  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
};

const encodeBase32 = (buffer) => {
  let bits = '';

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let output = '';

  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, '0');
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return output;
};

const generateTotpSecret = () => encodeBase32(crypto.randomBytes(20));

const generateTotpCode = (secret, options = {}) => {
  const time = options.time || Date.now();
  const counter = options.counter ?? Math.floor(time / 1000 / STEP_SECONDS);
  const key = decodeBase32(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);

  return String(binary % (10 ** DIGITS)).padStart(DIGITS, '0');
};

const verifyTotpCode = (secret, code, options = {}) => {
  const cleanCode = String(code || '').trim();

  if (!/^\d{6}$/.test(cleanCode)) {
    return false;
  }

  const time = options.time || Date.now();
  const window = Number.isInteger(options.window) ? options.window : 1;
  const currentCounter = Math.floor(time / 1000 / STEP_SECONDS);

  for (let offset = -window; offset <= window; offset += 1) {
    const expected = generateTotpCode(secret, { counter: currentCounter + offset });

    if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
};

const otpauthUrl = ({ secret, label, issuer = 'NotWhat' }) => {
  const params = new URLSearchParams({
    secret: normalizeBase32(secret),
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS)
  });

  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?${params.toString()}`;
};

module.exports = {
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  otpauthUrl
};
