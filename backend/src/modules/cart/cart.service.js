const AppError = require('../../utils/AppError');
const analyticsService = require('../analytics/analytics.service');
const Product = require('../products/product.model');
const Cart = require('./cart.model');

const SHIPPING_AMOUNT = 99;
const FREE_SHIPPING_THRESHOLD = 500;

const roundMoney = (value) => Math.round(value * 100) / 100;

const calculateShipping = (subtotal) => {
  if (subtotal <= 0 || subtotal >= FREE_SHIPPING_THRESHOLD) {
    return 0;
  }

  return SHIPPING_AMOUNT;
};

const recalculateCartTotals = (cart) => {
  const subtotal = cart.items.reduce((total, item) => {
    return total + item.quantity * item.priceSnapshot;
  }, 0);

  cart.subtotal = roundMoney(subtotal);
  cart.shipping = calculateShipping(cart.subtotal);
  cart.finalTotal = roundMoney(cart.subtotal + cart.shipping);

  return cart;
};

const getOrCreateCart = async (buyerId, options = {}) => {
  const { session } = options;
  let cart = await Cart.findOne({ buyerId }).session(session || null);

  if (!cart) {
    const [createdCart] = await Cart.create([{
      buyerId,
      items: [],
      subtotal: 0,
      shipping: 0,
      finalTotal: 0
    }], { session });
    cart = createdCart;
  }

  return cart;
};

const populateCart = (cartQuery) => {
  return cartQuery.populate({
    path: 'items.productId',
    select: 'title description productLink category region price stock imageUrls status storeId sellerId',
    populate: {
      path: 'storeId',
      select: 'storeName profileImageUrl verified city state region category'
    }
  });
};

const getCart = async (buyerId) => {
  const cart = await getOrCreateCart(buyerId);
  recalculateCartTotals(cart);
  await cart.save();

  return populateCart(Cart.findById(cart._id)).lean();
};

const getActiveProductForCart = async (productId) => {
  const product = await Product.findById(productId);

  if (!product || product.status !== 'active' || product.stock <= 0) {
    throw new AppError('Only active in-stock products can be added to cart', 400);
  }

  return product;
};

const addItem = async (buyerId, { productId, quantity }) => {
  const product = await getActiveProductForCart(productId);

  if (quantity > product.stock) {
    throw new AppError('Quantity cannot exceed available product stock', 400);
  }

  const cart = await getOrCreateCart(buyerId);
  const existingItem = cart.items.find((item) => item.productId.toString() === product._id.toString());

  if (existingItem) {
    const nextQuantity = existingItem.quantity + quantity;

    if (nextQuantity > product.stock) {
      throw new AppError('Quantity cannot exceed available product stock', 400);
    }

    existingItem.quantity = nextQuantity;
    existingItem.priceSnapshot = product.price;
  } else {
    cart.items.push({
      productId: product._id,
      quantity,
      priceSnapshot: product.price
    });
  }

  recalculateCartTotals(cart);
  await cart.save();
  await analyticsService.trackEventSafe({
    userId: buyerId,
    sellerId: product.sellerId,
    storeId: product.storeId,
    productId: product._id,
    eventType: 'cart_add',
    metadata: {
      quantity,
      priceSnapshot: product.price
    }
  });

  return populateCart(Cart.findById(cart._id)).lean();
};

const updateItem = async (buyerId, itemId, { quantity }) => {
  const cart = await getOrCreateCart(buyerId);
  const item = cart.items.id(itemId);

  if (!item) {
    throw new AppError('Cart item not found', 404);
  }

  const product = await getActiveProductForCart(item.productId);

  if (quantity > product.stock) {
    throw new AppError('Quantity cannot exceed available product stock', 400);
  }

  item.quantity = quantity;
  item.priceSnapshot = product.price;
  recalculateCartTotals(cart);
  await cart.save();

  return populateCart(Cart.findById(cart._id)).lean();
};

const deleteItem = async (buyerId, itemId) => {
  const cart = await getOrCreateCart(buyerId);
  const item = cart.items.id(itemId);

  if (!item) {
    throw new AppError('Cart item not found', 404);
  }

  cart.items.pull(item._id);
  recalculateCartTotals(cart);
  await cart.save();

  return populateCart(Cart.findById(cart._id)).lean();
};

const clearCart = async (buyerId, options = {}) => {
  const { session } = options;
  const cart = await getOrCreateCart(buyerId, { session });

  cart.items = [];
  recalculateCartTotals(cart);
  await cart.save({ session });

  return cart;
};

module.exports = {
  SHIPPING_AMOUNT,
  FREE_SHIPPING_THRESHOLD,
  recalculateCartTotals,
  getOrCreateCart,
  getCart,
  addItem,
  updateItem,
  deleteItem,
  clearCart
};
