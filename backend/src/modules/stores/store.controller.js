const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const storeService = require('./store.service');

const listStores = asyncHandler(async (req, res) => {
  const stores = await storeService.getStores(req.query, req.user);

  return successResponse(res, {
    message: 'Stores fetched successfully',
    data: stores
  });
});

const getStore = asyncHandler(async (req, res) => {
  const store = await storeService.getStoreById(req.params.id, req.user);

  return successResponse(res, {
    message: 'Store fetched successfully',
    data: store
  });
});

const getSellerStore = asyncHandler(async (req, res) => {
  const store = await storeService.getSellerStore(req.user.id);

  return successResponse(res, {
    message: 'Seller store fetched successfully',
    data: store
  });
});

const updateSellerStore = asyncHandler(async (req, res) => {
  const store = await storeService.updateSellerStore(req.user.id, req.body);

  return successResponse(res, {
    message: 'Seller store updated successfully',
    data: store
  });
});

const getStoreProducts = asyncHandler(async (req, res) => {
  const products = await storeService.getStoreProducts(req.params.id, req.query, req.user);

  return successResponse(res, {
    message: 'Store products fetched successfully',
    data: products
  });
});

const getStoreReels = asyncHandler(async (req, res) => {
  const reels = await storeService.getStoreReels(req.params.id, req.user);

  return successResponse(res, {
    message: 'Store reels fetched successfully',
    data: reels
  });
});

const recordStoreView = asyncHandler(async (req, res) => {
  const data = await storeService.recordStoreView(req.params.id, req.user);

  return successResponse(res, {
    message: 'Store view recorded successfully',
    data
  });
});

const saveStore = asyncHandler(async (req, res) => {
  const data = await storeService.saveStore(req.params.id, req.user);

  return successResponse(res, {
    message: 'Store saved successfully',
    data
  });
});

const unsaveStore = asyncHandler(async (req, res) => {
  const data = await storeService.unsaveStore(req.params.id, req.user);

  return successResponse(res, {
    message: 'Store unsaved successfully',
    data
  });
});

module.exports = {
  listStores,
  getStore,
  getSellerStore,
  updateSellerStore,
  getStoreProducts,
  getStoreReels,
  recordStoreView,
  saveStore,
  unsaveStore
};
