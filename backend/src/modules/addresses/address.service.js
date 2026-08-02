const mongoose = require('mongoose');

const AppError = require('../../utils/AppError');
const env = require('../../config/env');
const shiprocket = require('../../utils/shiprocket');
const Order = require('../orders/order.model');
const SellerProfile = require('../sellers/sellerProfile.model');
const User = require('../users/user.model');
const Address = require('./address.model');
const {
  cleanText,
  normalizePhone,
  normalizePostalCode,
  validateAddressPayload
} = require('./address.validation');

const toObjectId = (id) => (id ? new mongoose.Types.ObjectId(id) : null);

const addressWarnings = (address) => {
  const validation = validateAddressPayload(address, address.addressPurpose);
  return validation.warnings || [];
};

const sanitizeAddressPayload = (payload = {}, context = {}) => {
  const purpose = context.addressPurpose || payload.addressPurpose || 'delivery';
  const country = cleanText(payload.country || 'India') || 'India';
  const nickname = cleanText(payload.shiprocketPickupLocationNickname || payload.shiprocket?.pickupLocationNickname || '');

  return {
    label: cleanText(payload.label || (purpose === 'pickup' ? 'Pickup address' : 'Delivery address')),
    contactName: cleanText(payload.contactName || payload.name || ''),
    contactPhone: normalizePhone(payload.contactPhone || payload.phone || ''),
    alternatePhone: normalizePhone(payload.alternatePhone || ''),
    email: cleanText(payload.email || '').toLowerCase(),
    addressLine1: cleanText(payload.addressLine1 || payload.address || ''),
    addressLine2: cleanText(payload.addressLine2 || ''),
    landmark: cleanText(payload.landmark || ''),
    locality: cleanText(payload.locality || ''),
    city: cleanText(payload.city || ''),
    state: cleanText(payload.state || ''),
    country,
    postalCode: normalizePostalCode(payload.postalCode || payload.pincode || ''),
    addressType: cleanText(payload.addressType || (purpose === 'pickup' ? 'store' : 'home')).toLowerCase(),
    deliveryInstructions: cleanText(payload.deliveryInstructions || ''),
    pickupInstructions: cleanText(payload.pickupInstructions || ''),
    latitude: payload.latitude === '' || payload.latitude === undefined ? null : payload.latitude,
    longitude: payload.longitude === '' || payload.longitude === undefined ? null : payload.longitude,
    isDefault: payload.isDefault === true,
    shiprocket: {
      pickupLocationNickname: nickname,
      shiprocketPickupLocationId: cleanText(payload.shiprocketPickupLocationId || payload.shiprocket?.shiprocketPickupLocationId || ''),
      isSyncedToShiprocket: payload.shiprocket?.isSyncedToShiprocket === true,
      syncedAt: payload.shiprocket?.syncedAt || null,
      syncStatus: payload.shiprocket?.syncStatus || 'not_synced',
      syncError: cleanText(payload.shiprocket?.syncError || '')
    }
  };
};

const assertAddressValid = (payload, purpose) => {
  const validation = validateAddressPayload(payload, purpose);
  if (!validation.isValid) {
    throw new AppError(validation.errors[0] || 'Address validation failed', 400);
  }
  return validation;
};

const ownerFilter = (context = {}) => {
  if (context.addressOwnerType === 'buyer') {
    return {
      userId: context.userId,
      addressOwnerType: 'buyer',
      addressPurpose: context.addressPurpose || 'delivery'
    };
  }

  if (context.addressOwnerType === 'seller') {
    return {
      sellerId: context.sellerId,
      addressOwnerType: 'seller',
      addressPurpose: context.addressPurpose || 'pickup'
    };
  }

  return {
    addressOwnerType: context.addressOwnerType,
    addressPurpose: context.addressPurpose
  };
};

const unsetOtherDefaults = async (address, options = {}) => {
  const query = {
    _id: { $ne: address._id },
    addressOwnerType: address.addressOwnerType,
    addressPurpose: address.addressPurpose,
    isActive: true
  };

  if (address.addressOwnerType === 'buyer') {
    query.userId = address.userId;
  } else if (address.addressOwnerType === 'seller') {
    query.sellerId = address.sellerId;
    if (address.storeId) {
      query.storeId = address.storeId;
    }
  }

  await Address.updateMany(query, { $set: { isDefault: false } }, options);
};

const ensureDefaultFlag = async (address, context = {}) => {
  if (address.isDefault) {
    await unsetOtherDefaults(address);
    return;
  }

  const existingDefault = await Address.findOne({
    ...ownerFilter(context),
    isActive: true,
    isDefault: true
  }).select('_id').lean();

  if (!existingDefault) {
    address.isDefault = true;
    await unsetOtherDefaults(address);
  }
};

const listDeliveryAddresses = async (buyerId, includeInactive = false) => {
  const query = { userId: buyerId, addressOwnerType: 'buyer', addressPurpose: 'delivery' };
  if (!includeInactive) query.isActive = true;
  return Address.find(query).sort({ isDefault: -1, updatedAt: -1 }).lean();
};

const getDeliveryAddress = async (buyerId, addressId) => {
  const address = await Address.findOne({
    _id: addressId,
    userId: buyerId,
    addressOwnerType: 'buyer',
    addressPurpose: 'delivery'
  });
  if (!address || !address.isActive) throw new AppError('Delivery address not found', 404);
  return address;
};

const createDeliveryAddress = async (buyerId, payload = {}) => {
  const data = sanitizeAddressPayload(payload, { addressPurpose: 'delivery' });
  assertAddressValid(data, 'delivery');
  const address = new Address({
    ...data,
    userId: buyerId,
    addressOwnerType: 'buyer',
    addressPurpose: 'delivery'
  });
  await ensureDefaultFlag(address, { userId: buyerId, addressOwnerType: 'buyer', addressPurpose: 'delivery' });
  await address.save();
  return address.toObject();
};

const updateDeliveryAddress = async (buyerId, addressId, payload = {}) => {
  const address = await getDeliveryAddress(buyerId, addressId);
  const data = sanitizeAddressPayload({ ...address.toObject(), ...payload }, { addressPurpose: 'delivery' });
  assertAddressValid(data, 'delivery');
  Object.assign(address, data, { userId: buyerId, addressOwnerType: 'buyer', addressPurpose: 'delivery' });
  await ensureDefaultFlag(address, { userId: buyerId, addressOwnerType: 'buyer', addressPurpose: 'delivery' });
  await address.save();
  return address.toObject();
};

const setDefaultDeliveryAddress = async (buyerId, addressId) => {
  const address = await getDeliveryAddress(buyerId, addressId);
  address.isDefault = true;
  await unsetOtherDefaults(address);
  await address.save();
  return address.toObject();
};

const deleteDeliveryAddress = async (buyerId, addressId) => {
  const address = await getDeliveryAddress(buyerId, addressId);
  address.isActive = false;
  address.isDefault = false;
  await address.save();
  return { deactivated: true };
};

const listPickupAddresses = async (sellerId, includeInactive = false) => {
  const query = { sellerId, addressOwnerType: 'seller', addressPurpose: 'pickup' };
  if (!includeInactive) query.isActive = true;
  return Address.find(query).sort({ isDefault: -1, updatedAt: -1 }).lean();
};

const getPickupAddress = async (sellerId, addressId) => {
  const address = await Address.findOne({
    _id: addressId,
    sellerId,
    addressOwnerType: 'seller',
    addressPurpose: 'pickup'
  });
  if (!address || !address.isActive) throw new AppError('Pickup address not found', 404);
  return address;
};

const createPickupAddress = async (sellerId, payload = {}) => {
  const profile = await SellerProfile.findOne({ userId: sellerId }).select('_id userId storeName city state').lean();
  const seller = await User.findById(sellerId).select('email').lean();
  const data = sanitizeAddressPayload({
    email: seller?.email || '',
    ...payload
  }, { addressPurpose: 'pickup' });
  assertAddressValid(data, 'pickup');
  const address = new Address({
    ...data,
    sellerId,
    userId: sellerId,
    storeId: payload.storeId ? toObjectId(payload.storeId) : null,
    addressOwnerType: 'seller',
    addressPurpose: 'pickup'
  });
  await ensureDefaultFlag(address, { sellerId, addressOwnerType: 'seller', addressPurpose: 'pickup' });
  await address.save();
  await syncLegacySellerProfilePickupAddress(sellerId, address);
  return address.toObject();
};

const updatePickupAddress = async (sellerId, addressId, payload = {}) => {
  const address = await getPickupAddress(sellerId, addressId);
  const data = sanitizeAddressPayload({ ...address.toObject(), ...payload }, { addressPurpose: 'pickup' });
  assertAddressValid(data, 'pickup');
  Object.assign(address, data, {
    sellerId,
    userId: sellerId,
    addressOwnerType: 'seller',
    addressPurpose: 'pickup'
  });
  await ensureDefaultFlag(address, { sellerId, addressOwnerType: 'seller', addressPurpose: 'pickup' });
  await address.save();
  await syncLegacySellerProfilePickupAddress(sellerId, address);
  return address.toObject();
};

const setDefaultPickupAddress = async (sellerId, addressId) => {
  const address = await getPickupAddress(sellerId, addressId);
  address.isDefault = true;
  await unsetOtherDefaults(address);
  await address.save();
  await syncLegacySellerProfilePickupAddress(sellerId, address);
  return address.toObject();
};

const deletePickupAddress = async (sellerId, addressId) => {
  const address = await getPickupAddress(sellerId, addressId);
  address.isActive = false;
  address.isDefault = false;
  await address.save();
  return { deactivated: true };
};

const buildPickupNickname = (sellerId, address) => {
  const source = address.shiprocket?.pickupLocationNickname || address.label || 'pickup';
  const slug = source.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 28) || 'pickup';
  return `notwhat_${sellerId.toString().slice(-8)}_${slug}`.slice(0, 50);
};

const shiprocketErrorMessage = (error) => {
  const data = error.response?.data;
  const detail = data?.message || data?.error || data?.errors || error.message;

  if (!detail) {
    return 'Unknown Shiprocket error';
  }

  if (typeof detail === 'string') {
    return detail;
  }

  try {
    return JSON.stringify(detail);
  } catch (_err) {
    return 'Unreadable Shiprocket error';
  }
};

const isDuplicateShiprocketPickupError = (error) => {
  if (error.response?.status !== 422) {
    return false;
  }

  return /already|exist|duplicate/i.test(shiprocketErrorMessage(error));
};

const shiprocketAddressLine = (address) => {
  const parts = [address.addressLine1, address.addressLine2, address.locality, address.landmark]
    .map(cleanText)
    .filter(Boolean);
  return [...new Set(parts)].join(', ').slice(0, 190);
};

const syncPickupAddressToShiprocket = async (sellerId, addressId) => {
  const address = await getPickupAddress(sellerId, addressId);
  assertAddressValid(address.toObject(), 'pickup');
  const seller = await User.findById(sellerId).select('email').lean();
  const nickname = address.shiprocket?.pickupLocationNickname || buildPickupNickname(sellerId, address);
  let response = {};

  try {
    if (env.shiprocketEnableLivePickupSync) {
      response = await shiprocket.registerPickupLocation({
        pickup_location: nickname,
        name: address.contactName,
        email: address.email || seller?.email || 'seller@notwhat.in',
        phone: address.contactPhone,
        address: shiprocketAddressLine(address),
        address_2: [address.locality, address.addressLine2, address.landmark].filter(Boolean).join(', '),
        city: address.city,
        state: address.state,
        country: address.country || 'India',
        pin_code: address.postalCode
      });
    }
  } catch (error) {
    if (!isDuplicateShiprocketPickupError(error)) {
      const message = shiprocketErrorMessage(error);
      address.shiprocket = {
        ...(address.shiprocket || {}),
        pickupLocationNickname: nickname,
        isSyncedToShiprocket: false,
        syncStatus: 'failed',
        syncError: message
      };
      await address.save();
      throw new AppError(`Shiprocket could not process this address: ${message}`, 502);
    }

    response = { message: shiprocketErrorMessage(error) };
  }

  address.shiprocket = {
    pickupLocationNickname: nickname,
    shiprocketPickupLocationId: cleanText(response.pickup_id || response.id || address.shiprocket?.shiprocketPickupLocationId || `shiprocket_pickup_${nickname}`),
    isSyncedToShiprocket: true,
    syncedAt: new Date(),
    syncStatus: 'synced',
    syncError: ''
  };
  address.isVerified = true;
  await address.save();
  await syncLegacySellerProfilePickupAddress(sellerId, address);
  return address.toObject();
};

const getDefaultDeliveryAddress = async (buyerId) => Address.findOne({
  userId: buyerId,
  addressOwnerType: 'buyer',
  addressPurpose: 'delivery',
  isActive: true,
  isDefault: true
});

const getDefaultPickupAddress = async (sellerId) => Address.findOne({
  sellerId,
  addressOwnerType: 'seller',
  addressPurpose: 'pickup',
  isActive: true,
  isDefault: true
});

const resolveDeliveryAddressForOrder = async (buyerId, { deliveryAddressId, shippingInfo } = {}) => {
  let address = null;
  if (deliveryAddressId) {
    address = await getDeliveryAddress(buyerId, deliveryAddressId);
  } else if (shippingInfo) {
    const data = sanitizeAddressPayload({
      contactName: shippingInfo.name,
      contactPhone: shippingInfo.phone,
      email: shippingInfo.email,
      addressLine1: shippingInfo.address,
      city: shippingInfo.city,
      state: shippingInfo.state,
      postalCode: shippingInfo.postalCode,
      addressType: 'home'
    }, { addressPurpose: 'delivery' });
    assertAddressValid(data, 'delivery');
    return {
      address: null,
      shippingInfo: legacyShippingInfoFromAddress(data),
      snapshot: shippingSnapshotFromAddress(data)
    };
  } else {
    address = await getDefaultDeliveryAddress(buyerId);
  }

  if (!address) {
    throw new AppError('Please add a delivery address before checkout.', 400);
  }

  assertAddressValid(address.toObject(), 'delivery');
  return {
    address,
    shippingInfo: legacyShippingInfoFromAddress(address),
    snapshot: shippingSnapshotFromAddress(address),
    warnings: addressWarnings(address)
  };
};

const legacyShippingInfoFromAddress = (address = {}) => ({
  name: address.contactName || address.name || '',
  email: address.email || '',
  phone: address.contactPhone || address.phone || '',
  address: [address.addressLine1 || address.address || '', address.addressLine2 || '', address.locality || '', address.landmark || ''].filter(Boolean).join(', '),
  city: address.city || '',
  state: address.state || '',
  postalCode: address.postalCode || address.pincode || ''
});

const shippingSnapshotFromAddress = (address = {}) => ({
  contactName: address.contactName || address.name || '',
  contactPhone: address.contactPhone || address.phone || '',
  email: address.email || '',
  addressLine1: address.addressLine1 || address.address || '',
  addressLine2: address.addressLine2 || '',
  locality: address.locality || '',
  landmark: address.landmark || '',
  city: address.city || '',
  state: address.state || '',
  country: address.country || 'India',
  postalCode: address.postalCode || address.pincode || '',
  deliveryInstructions: address.deliveryInstructions || ''
});

const pickupSnapshotFromAddress = (address = {}) => ({
  contactName: address.contactName || address.name || '',
  contactPhone: address.contactPhone || address.phone || '',
  email: address.email || '',
  addressLine1: address.addressLine1 || address.address || '',
  addressLine2: address.addressLine2 || '',
  locality: address.locality || '',
  landmark: address.landmark || '',
  city: address.city || '',
  state: address.state || '',
  country: address.country || 'India',
  postalCode: address.postalCode || address.pincode || '',
  pickupInstructions: address.pickupInstructions || '',
  shiprocketPickupLocationNickname: address.shiprocket?.pickupLocationNickname || address.shiprocketPickupLocationNickname || ''
});

const resolvePickupAddressForShipment = async (sellerId, pickupAddressId) => {
  let address = pickupAddressId
    ? await getPickupAddress(sellerId, pickupAddressId)
    : await getDefaultPickupAddress(sellerId);

  if (!address) {
    const profile = await SellerProfile.findOne({ userId: sellerId }).lean();
    if (profile?.pickupAddress?.address && profile?.pickupAddress?.pincode && profile?.pickupAddress?.phone) {
      address = {
        contactName: profile.pickupAddress.name || profile.storeName,
        contactPhone: profile.pickupAddress.phone,
        email: '',
        addressLine1: profile.pickupAddress.address,
        addressLine2: '',
        locality: profile.pickupAddress.locality || '',
        landmark: '',
        city: profile.pickupAddress.city || profile.city,
        state: profile.pickupAddress.state || profile.state,
        country: profile.pickupAddress.country || 'India',
        postalCode: profile.pickupAddress.pincode,
        addressType: 'store',
        pickupInstructions: '',
        shiprocket: { pickupLocationNickname: profile.shiprocketPickupName || '' }
      };
    }
  }

  if (!address) {
    throw new AppError('Please select a pickup address before creating shipment.', 400);
  }

  assertAddressValid(address.toObject ? address.toObject() : address, 'pickup');
  return address;
};

const syncLegacySellerProfilePickupAddress = async (sellerId, address) => {
  if (!address.isDefault || !address.isActive) return;
  await SellerProfile.findOneAndUpdate(
    { userId: sellerId },
    {
      $set: {
        pickupAddress: {
          name: address.contactName,
          phone: address.contactPhone,
          address: [address.addressLine1, address.addressLine2, address.landmark].filter(Boolean).join(', '),
          pincode: address.postalCode
        },
        shiprocketPickupName: address.shiprocket?.pickupLocationNickname || ''
      }
    }
  );
};

const adminListAddresses = async (query = {}) => {
  const filter = {};
  if (query.addressOwnerType) filter.addressOwnerType = query.addressOwnerType;
  if (query.addressPurpose) filter.addressPurpose = query.addressPurpose;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true' || query.isActive === true;
  if (query.q) {
    const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [
      { label: regex },
      { contactName: regex },
      { contactPhone: regex },
      { addressLine1: regex },
      { city: regex },
      { state: regex },
      { postalCode: regex }
    ];
  }
  return Address.find(filter)
    .populate('userId', 'name email phone role')
    .populate('sellerId', 'name email phone role')
    .populate('storeId', 'storeName city state')
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
};

const adminGetAddress = async (addressId) => {
  const address = await Address.findById(addressId)
    .populate('userId', 'name email phone role')
    .populate('sellerId', 'name email phone role')
    .populate('storeId', 'storeName city state')
    .lean();
  if (!address) throw new AppError('Address not found', 404);
  return address;
};

const adminVerifyAddress = async (addressId, isVerified = true) => {
  const address = await Address.findByIdAndUpdate(addressId, { isVerified }, { new: true }).lean();
  if (!address) throw new AppError('Address not found', 404);
  return address;
};

const adminDeactivateAddress = async (addressId) => {
  const address = await Address.findByIdAndUpdate(addressId, { isActive: false, isDefault: false }, { new: true }).lean();
  if (!address) throw new AppError('Address not found', 404);
  return address;
};

module.exports = {
  sanitizeAddressPayload,
  assertAddressValid,
  validateAddressPayload,
  listDeliveryAddresses,
  createDeliveryAddress,
  getDeliveryAddress,
  updateDeliveryAddress,
  deleteDeliveryAddress,
  setDefaultDeliveryAddress,
  listPickupAddresses,
  createPickupAddress,
  getPickupAddress,
  updatePickupAddress,
  deletePickupAddress,
  setDefaultPickupAddress,
  syncPickupAddressToShiprocket,
  getDefaultDeliveryAddress,
  getDefaultPickupAddress,
  resolveDeliveryAddressForOrder,
  resolvePickupAddressForShipment,
  legacyShippingInfoFromAddress,
  shippingSnapshotFromAddress,
  pickupSnapshotFromAddress,
  buildPickupNickname,
  adminListAddresses,
  adminGetAddress,
  adminVerifyAddress,
  adminDeactivateAddress
};
