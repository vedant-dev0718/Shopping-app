const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const addressService = require('./address.service');

const listDeliveryAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.listDeliveryAddresses(req.user.id);
  return successResponse(res, { message: 'Delivery addresses fetched successfully', data: addresses });
});

const createDeliveryAddress = asyncHandler(async (req, res) => {
  const address = await addressService.createDeliveryAddress(req.user.id, req.body);
  return successResponse(res, { statusCode: 201, message: 'Delivery address saved successfully', data: address });
});

const getDeliveryAddress = asyncHandler(async (req, res) => {
  const address = await addressService.getDeliveryAddress(req.user.id, req.params.addressId);
  return successResponse(res, { message: 'Delivery address fetched successfully', data: address });
});

const updateDeliveryAddress = asyncHandler(async (req, res) => {
  const address = await addressService.updateDeliveryAddress(req.user.id, req.params.addressId, req.body);
  return successResponse(res, { message: 'Delivery address updated successfully', data: address });
});

const deleteDeliveryAddress = asyncHandler(async (req, res) => {
  const result = await addressService.deleteDeliveryAddress(req.user.id, req.params.addressId);
  return successResponse(res, { message: 'Delivery address deactivated successfully', data: result });
});

const setDefaultDeliveryAddress = asyncHandler(async (req, res) => {
  const address = await addressService.setDefaultDeliveryAddress(req.user.id, req.params.addressId);
  return successResponse(res, { message: 'Default delivery address updated successfully', data: address });
});

const validateDeliveryAddress = asyncHandler(async (req, res) => {
  const validation = addressService.validateAddressPayload(req.body, 'delivery');
  return successResponse(res, { message: validation.isValid ? 'Address is valid' : 'Address validation failed', data: validation });
});

const listPickupAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.listPickupAddresses(req.user.id);
  return successResponse(res, { message: 'Pickup addresses fetched successfully', data: addresses });
});

const createPickupAddress = asyncHandler(async (req, res) => {
  const address = await addressService.createPickupAddress(req.user.id, req.body);
  return successResponse(res, { statusCode: 201, message: 'Pickup address saved successfully', data: address });
});

const getPickupAddress = asyncHandler(async (req, res) => {
  const address = await addressService.getPickupAddress(req.user.id, req.params.addressId);
  return successResponse(res, { message: 'Pickup address fetched successfully', data: address });
});

const updatePickupAddress = asyncHandler(async (req, res) => {
  const address = await addressService.updatePickupAddress(req.user.id, req.params.addressId, req.body);
  return successResponse(res, { message: 'Pickup address updated successfully', data: address });
});

const deletePickupAddress = asyncHandler(async (req, res) => {
  const result = await addressService.deletePickupAddress(req.user.id, req.params.addressId);
  return successResponse(res, { message: 'Pickup address deactivated successfully', data: result });
});

const setDefaultPickupAddress = asyncHandler(async (req, res) => {
  const address = await addressService.setDefaultPickupAddress(req.user.id, req.params.addressId);
  return successResponse(res, { message: 'Default pickup address updated successfully', data: address });
});

const syncPickupAddress = asyncHandler(async (req, res) => {
  const address = await addressService.syncPickupAddressToShiprocket(req.user.id, req.params.addressId);
  return successResponse(res, { message: 'Pickup address synced with Shiprocket', data: address });
});

const validatePickupAddress = asyncHandler(async (req, res) => {
  const validation = addressService.validateAddressPayload(req.body, 'pickup');
  return successResponse(res, { message: validation.isValid ? 'Address is valid' : 'Address validation failed', data: validation });
});

const adminListAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.adminListAddresses(req.query);
  return successResponse(res, { message: 'Addresses fetched successfully', data: addresses });
});

const adminGetAddress = asyncHandler(async (req, res) => {
  const address = await addressService.adminGetAddress(req.params.addressId);
  return successResponse(res, { message: 'Address fetched successfully', data: address });
});

const adminUserAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.listDeliveryAddresses(req.params.userId, true);
  return successResponse(res, { message: 'User addresses fetched successfully', data: addresses });
});

const adminSellerPickupAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.listPickupAddresses(req.params.sellerId, true);
  return successResponse(res, { message: 'Seller pickup addresses fetched successfully', data: addresses });
});

const adminVerifyAddress = asyncHandler(async (req, res) => {
  const address = await addressService.adminVerifyAddress(req.params.addressId, req.body.isVerified !== false);
  return successResponse(res, { message: 'Address verification updated successfully', data: address });
});

const adminDeactivateAddress = asyncHandler(async (req, res) => {
  const address = await addressService.adminDeactivateAddress(req.params.addressId);
  return successResponse(res, { message: 'Address deactivated successfully', data: address });
});

module.exports = {
  listDeliveryAddresses,
  createDeliveryAddress,
  getDeliveryAddress,
  updateDeliveryAddress,
  deleteDeliveryAddress,
  setDefaultDeliveryAddress,
  validateDeliveryAddress,
  listPickupAddresses,
  createPickupAddress,
  getPickupAddress,
  updatePickupAddress,
  deletePickupAddress,
  setDefaultPickupAddress,
  syncPickupAddress,
  validatePickupAddress,
  adminListAddresses,
  adminGetAddress,
  adminUserAddresses,
  adminSellerPickupAddresses,
  adminVerifyAddress,
  adminDeactivateAddress
};
