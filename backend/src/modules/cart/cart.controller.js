const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const cartService = require('./cart.service');

const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getCart(req.user.id);

  return successResponse(res, {
    message: 'Cart fetched successfully',
    data: cart
  });
});

const addItem = asyncHandler(async (req, res) => {
  const cart = await cartService.addItem(req.user.id, req.body);

  return successResponse(res, {
    statusCode: 201,
    message: 'Cart item added successfully',
    data: cart
  });
});

const updateItem = asyncHandler(async (req, res) => {
  const cart = await cartService.updateItem(req.user.id, req.params.itemId, req.body);

  return successResponse(res, {
    message: 'Cart item updated successfully',
    data: cart
  });
});

const deleteItem = asyncHandler(async (req, res) => {
  const cart = await cartService.deleteItem(req.user.id, req.params.itemId);

  return successResponse(res, {
    message: 'Cart item removed successfully',
    data: cart
  });
});

module.exports = {
  getCart,
  addItem,
  updateItem,
  deleteItem
};
