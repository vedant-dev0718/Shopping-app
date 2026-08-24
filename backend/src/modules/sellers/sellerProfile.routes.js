const router = require('express').Router();
const { body } = require('express-validator');

const { authenticate } = require('../../middleware/auth.middleware');
const { requireSeller } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const { successResponse } = require('../../utils/apiResponse');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const SellerProfile = require('./sellerProfile.model');
const shiprocket = require('../../utils/shiprocket');

router.use(authenticate, requireSeller);

const getSellerProfile = async (sellerId) => {
  const profile = await SellerProfile.findOne({ userId: sellerId });

  if (!profile) {
    throw new AppError('Seller profile not found', 404);
  }

  return profile;
};

const getBankAccount = (profile) => profile.bankAccount || {};

const buildKycResponse = (profile) => ({
  kycStatus: profile.kycStatus,
  panNumber: profile.panNumber,
  gstNumber: profile.gstNumber,
  upiId: profile.upiId,
  bankAccount: {
    accountNumber: getBankAccount(profile).accountNumber || '',
    ifscCode: getBankAccount(profile).ifscCode || '',
    accountHolderName: getBankAccount(profile).accountHolderName || '',
    bankName: getBankAccount(profile).bankName || '',
    isVerified: getBankAccount(profile).isVerified || false
  }
});

const pickupAddressValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('locality').optional({ checkFalsy: true }).trim(),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pincode').trim().matches(/^\d{6}$/).withMessage('Pincode must be a 6-digit number'),
  body('country').trim().notEmpty().withMessage('Country is required')
];

const buildPickupAddressResponse = (profile) => ({
  pickupAddress: {
    name: profile.pickupAddress?.name || '',
    phone: profile.pickupAddress?.phone || '',
    address: profile.pickupAddress?.address || '',
    locality: profile.pickupAddress?.locality || '',
    city: profile.pickupAddress?.city || profile.city || '',
    state: profile.pickupAddress?.state || profile.state || '',
    pincode: profile.pickupAddress?.pincode || '',
    country: profile.pickupAddress?.country || 'India'
  },
  isSet: !!(profile.pickupAddress?.address && profile.pickupAddress?.pincode),
  isRegistered: !!profile.shiprocketPickupName,
  shiprocketPickupName: profile.shiprocketPickupName || '',
  pickupName: profile.shiprocketPickupName || ''
});

const registerSellerPickupAddress = async (req, res) => {
  const { name, phone, address, locality = '', city, state, pincode, country } = req.body;
  const profile = await getSellerProfile(req.user.id);
  const pickupLocationName = `store-${profile.storeId.toString()}`;

  try {
    await shiprocket.registerPickupLocation({
      pickup_location: pickupLocationName,
      name,
      email: req.user.email,
      phone,
      address,
      address_2: locality,
      city,
      state,
      country,
      pin_code: pincode
    });
  } catch (err) {
    const shiprocketMsg = err.response?.data?.message || err.message;
    if (err.response?.status !== 422) {
      throw new AppError(`Shiprocket pickup registration failed: ${shiprocketMsg}`, 502);
    }
  }

  profile.pickupAddress = { name, phone, address, locality, city, state, pincode, country };
  profile.shiprocketPickupName = pickupLocationName;
  await profile.save();

  const message = 'Pickup address registered. Shiprocket will send an OTP to verify.';

  return successResponse(res, {
    message,
    data: {
      ...buildPickupAddressResponse(profile),
      pickupName: pickupLocationName,
      message
    }
  });
};

const getSellerPickupAddress = async (req, res) => {
  const profile = await getSellerProfile(req.user.id);

  return successResponse(res, {
    message: 'Pickup address fetched successfully',
    data: buildPickupAddressResponse(profile)
  });
};

router.post('/me/kyc/submit', asyncHandler(async (req, res) => {
  const profile = await getSellerProfile(req.user.id);
  const bankAccount = req.body.bankAccount || {};

  const panNumber = req.body.panNumber || '';
  const gstNumber = req.body.gstNumber || '';
  const accountNumber = bankAccount.accountNumber || req.body.accountNumber || '';
  const ifscCode = bankAccount.ifscCode || req.body.ifscCode || '';
  const accountHolderName = bankAccount.accountHolderName || req.body.accountHolderName || '';
  const bankName = bankAccount.bankName || req.body.bankName || '';

  if (!panNumber || !gstNumber || !accountNumber || !ifscCode || !accountHolderName) {
    throw new AppError('PAN, GST number, account number, IFSC code, and account holder name are required', 400);
  }

  profile.panNumber = panNumber;
  profile.gstNumber = gstNumber;
  profile.upiId = req.body.upiId || profile.upiId;
  profile.bankAccount = profile.bankAccount || {};
  profile.bankAccount.accountNumber = accountNumber;
  profile.bankAccount.ifscCode = ifscCode;
  profile.bankAccount.accountHolderName = accountHolderName;
  profile.bankAccount.bankName = bankName;
  profile.bankAccount.isVerified = false;
  profile.kycStatus = 'pending';

  await profile.save();

  return successResponse(res, {
    message: 'KYC submitted successfully and is pending manual review',
    data: buildKycResponse(profile)
  });
}));

router.get('/me/kyc', asyncHandler(async (req, res) => {
  const profile = await getSellerProfile(req.user.id);

  return successResponse(res, {
    message: 'Seller KYC status fetched successfully',
    data: buildKycResponse(profile)
  });
}));

const UPI_ID_PATTERN = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;

router.get('/me/payment', asyncHandler(async (req, res) => {
  const profile = await getSellerProfile(req.user.id);

  return successResponse(res, {
    message: 'Seller payment details fetched successfully',
    data: { upiId: profile.upiId || '', storeName: profile.storeName || '' }
  });
}));

router.patch('/me/payment', asyncHandler(async (req, res) => {
  const profile = await getSellerProfile(req.user.id);
  const upiId = String(req.body.upiId || '').trim();

  if (!UPI_ID_PATTERN.test(upiId)) {
    throw new AppError('Enter a valid UPI ID, for example store@okaxis', 400);
  }

  profile.upiId = upiId;
  await profile.save();

  return successResponse(res, {
    message: 'UPI ID updated successfully',
    data: { upiId: profile.upiId, storeName: profile.storeName || '' }
  });
}));

// Future phase: add admin-only KYC approval/rejection endpoints for manual review.

router.post('/pickup-address', pickupAddressValidation, validate, asyncHandler(registerSellerPickupAddress));
router.put('/me/pickup-address', pickupAddressValidation, validate, asyncHandler(registerSellerPickupAddress));
router.get('/pickup-address', asyncHandler(getSellerPickupAddress));
router.get('/me/pickup-address', asyncHandler(getSellerPickupAddress));

module.exports = router;
