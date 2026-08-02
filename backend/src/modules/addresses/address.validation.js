const { body, param, query } = require('express-validator');

const ADDRESS_OWNER_TYPES = ['buyer', 'seller', 'admin'];
const ADDRESS_PURPOSES = ['delivery', 'pickup', 'billing', 'return'];
const ADDRESS_TYPES = ['home', 'work', 'store', 'warehouse', 'office', 'other'];

const unsafePattern = /[<>`{}$]/;

const normalizePhone = (value = '') => value.toString().replace(/[^\d+]/g, '').replace(/^(\+91|91)/, '');
const normalizePostalCode = (value = '') => value.toString().trim().replace(/\s+/g, '');
const cleanText = (value = '') => value.toString().trim().replace(/\s+/g, ' ');

const hasUnsafeCharacters = (value = '') => unsafePattern.test(value);

const validateAddressPayload = (payload = {}, purpose = 'delivery') => {
  const errors = [];
  const country = cleanText(payload.country || 'India') || 'India';
  const contactPhone = normalizePhone(payload.contactPhone || payload.phone || '');
  const alternatePhone = normalizePhone(payload.alternatePhone || '');
  const postalCode = normalizePostalCode(payload.postalCode || payload.pincode || '');
  const addressLine1 = cleanText(payload.addressLine1 || payload.address || '');
  const addressLine2 = cleanText(payload.addressLine2 || '');
  const city = cleanText(payload.city || '');
  const state = cleanText(payload.state || '');

  const required = [
    ['contactName', cleanText(payload.contactName || payload.name || '')],
    ['contactPhone', contactPhone],
    ['addressLine1', addressLine1],
    ['city', city],
    ['state', state],
    ['country', country],
    ['postalCode', postalCode]
  ];

  required.forEach(([field, value]) => {
    if (!value) {
      errors.push(`${field} is required`);
    }
  });

  if (country.toLowerCase() === 'india') {
    if (!/^[1-9]\d{5}$/.test(postalCode)) {
      errors.push('Pincode must be 6 digits.');
    }

    if (!/^[6-9]\d{9}$/.test(contactPhone)) {
      errors.push('Phone must be a valid Indian mobile number.');
    }

    if (alternatePhone && !/^[6-9]\d{9}$/.test(alternatePhone)) {
      errors.push('Alternate phone must be a valid Indian mobile number.');
    }
  }

  if (addressLine1.length > 0 && addressLine1.length < 3) {
    errors.push('Address line 1 must be at least 3 characters.');
  }

  if (addressLine1.length > 190 || addressLine2.length > 190) {
    errors.push('Address line is too long. Please shorten it.');
  }

  [
    payload.label,
    payload.contactName || payload.name,
    payload.email,
    addressLine1,
    addressLine2,
    payload.landmark,
    city,
    state,
    country,
    payload.deliveryInstructions,
    payload.pickupInstructions,
    payload.shiprocketPickupLocationNickname
  ].forEach((value) => {
    if (value && hasUnsafeCharacters(value)) {
      errors.push('Address contains unsupported characters for shipping.');
    }
  });

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(payload.email).toLowerCase())) {
    errors.push('Email must be valid.');
  }

  const addressType = cleanText(payload.addressType || (purpose === 'pickup' ? 'store' : 'home')).toLowerCase();
  if (!ADDRESS_TYPES.includes(addressType)) {
    errors.push('Invalid address type.');
  }

  const warnings = [];
  if ((addressLine1.length + addressLine2.length + cleanText(payload.landmark || '').length) > 180) {
    warnings.push('Address is long and may be rejected by Shiprocket.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

const sharedAddressRules = [
  body('label').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Label must be 80 characters or fewer'),
  body('contactName').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Contact name must be 120 characters or fewer'),
  body('contactPhone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).withMessage('Phone must be 20 characters or fewer'),
  body('alternatePhone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).withMessage('Alternate phone must be 20 characters or fewer'),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('addressLine1').optional({ checkFalsy: true }).trim().isLength({ max: 190 }).withMessage('Address line is too long. Please shorten it.'),
  body('addressLine2').optional({ checkFalsy: true }).trim().isLength({ max: 190 }).withMessage('Address line is too long. Please shorten it.'),
  body('locality').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Locality must be 120 characters or fewer'),
  body('landmark').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('Landmark must be 120 characters or fewer'),
  body('city').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('City must be 80 characters or fewer'),
  body('state').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('State must be 80 characters or fewer'),
  body('country').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Country must be 80 characters or fewer'),
  body('postalCode').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).withMessage('Postal code must be 20 characters or fewer'),
  body('addressType').optional({ checkFalsy: true }).trim().isIn(ADDRESS_TYPES).withMessage('Invalid address type'),
  body('deliveryInstructions').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).withMessage('Delivery instructions must be 300 characters or fewer'),
  body('pickupInstructions').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).withMessage('Pickup instructions must be 300 characters or fewer'),
  body('latitude').optional({ nullable: true }).isFloat({ min: -90, max: 90 }).withMessage('Latitude must be valid'),
  body('longitude').optional({ nullable: true }).isFloat({ min: -180, max: 180 }).withMessage('Longitude must be valid'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean'),
  body('shiprocketPickupLocationNickname').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Shiprocket pickup nickname must be 80 characters or fewer')
];

const addressIdValidation = [
  param('addressId').isMongoId().withMessage('A valid address id is required')
];

const adminAddressListValidation = [
  query('addressOwnerType').optional().isIn(ADDRESS_OWNER_TYPES).withMessage('Invalid owner type'),
  query('addressPurpose').optional().isIn(ADDRESS_PURPOSES).withMessage('Invalid address purpose'),
  query('isActive').optional().isBoolean().withMessage('isActive must be true or false'),
  query('q').optional({ checkFalsy: true }).trim().isLength({ max: 120 })
];

module.exports = {
  ADDRESS_OWNER_TYPES,
  ADDRESS_PURPOSES,
  ADDRESS_TYPES,
  normalizePhone,
  normalizePostalCode,
  cleanText,
  validateAddressPayload,
  sharedAddressRules,
  addressIdValidation,
  adminAddressListValidation
};
