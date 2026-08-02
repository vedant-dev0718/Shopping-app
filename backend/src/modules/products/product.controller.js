const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const productService = require('./product.service');

const listProducts = asyncHandler(async (req, res) => {
  const products = await productService.getProducts(req.query, req.user);

  return successResponse(res, {
    message: 'Products fetched successfully',
    data: products
  });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id, req.user);

  return successResponse(res, {
    message: 'Product fetched successfully',
    data: product
  });
});

const getRelatedProducts = asyncHandler(async (req, res) => {
  const products = await productService.getRelatedProducts(req.params.id, req.user);

  return successResponse(res, {
    message: 'Related products fetched successfully',
    data: products
  });
});

const saveProduct = asyncHandler(async (req, res) => {
  const data = await productService.saveProduct(req.params.id, req.user);

  return successResponse(res, {
    message: 'Product saved successfully',
    data
  });
});

const unsaveProduct = asyncHandler(async (req, res) => {
  const data = await productService.unsaveProduct(req.params.id, req.user);

  return successResponse(res, {
    message: 'Product unsaved successfully',
    data
  });
});

const recordProductClick = asyncHandler(async (req, res) => {
  const data = await productService.recordProductClick(req.params.id, req.user);

  return successResponse(res, {
    message: 'Product click recorded successfully',
    data
  });
});

const createSellerProduct = asyncHandler(async (req, res) => {
  const product = await productService.createSellerProduct(req.user, req.body);

  return successResponse(res, {
    statusCode: 201,
    message: 'Product created successfully',
    data: product
  });
});

const listSellerProducts = asyncHandler(async (req, res) => {
  const products = await productService.getSellerProducts(req.user.id);

  return successResponse(res, {
    message: 'Seller products fetched successfully',
    data: products
  });
});

const updateSellerProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateSellerProduct(req.user, req.params.id, req.body);

  return successResponse(res, {
    message: 'Product updated successfully',
    data: product
  });
});

const deleteSellerProduct = asyncHandler(async (req, res) => {
  const data = await productService.deleteSellerProduct(req.user, req.params.id);

  return successResponse(res, {
    message: 'Product deleted successfully',
    data
  });
});

module.exports = {
  listProducts,
  getProduct,
  getRelatedProducts,
  saveProduct,
  unsaveProduct,
  recordProductClick,
  listSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct
};
