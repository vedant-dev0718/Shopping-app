const Order = require('../../src/modules/orders/order.model');

const createOrder = async ({ buyer, seller, product, overrides = {} }) => {
  const orderStatus = overrides.orderStatus || 'placed';

  return Order.create({
  buyerId: buyer._id,
  orderNumber: overrides.orderNumber || `NW-QA-${Date.now()}`,
  items: [{
    productId: product._id,
    sellerId: seller._id,
    storeId: seller.testStore._id,
    titleSnapshot: product.title,
    priceSnapshot: product.price,
    quantity: overrides.quantity || 1,
    itemTotal: product.price * (overrides.quantity || 1),
    itemSubtotal: product.price * (overrides.quantity || 1),
    itemStatus: overrides.itemStatus || 'placed',
    itemAcceptanceStatus: overrides.itemAcceptanceStatus || (orderStatus === 'awaiting_seller_acceptance' ? 'pending' : 'accepted'),
    payoutStatus: overrides.payoutStatus || 'pending'
  }],
  subtotal: product.price * (overrides.quantity || 1),
  shipping: overrides.shipping ?? 99,
  finalTotal: (product.price * (overrides.quantity || 1)) + (overrides.shipping ?? 99),
  totalProductAmount: product.price * (overrides.quantity || 1),
  totalShippingAmount: overrides.shipping ?? 99,
  totalPlatformCommission: overrides.totalPlatformCommission || 0,
  totalSellerEarnings: overrides.totalSellerEarnings || 0,
  paymentMethod: overrides.paymentMethod || 'UPI',
  paymentStatus: overrides.paymentStatus || 'paid',
  orderStatus,
  shippingInfo: overrides.shippingInfo || {
    name: 'Buyer QA',
    email: 'buyer@example.com',
    phone: '9999999999',
    address: '123 QA Street',
    city: 'Jaipur',
    state: 'Rajasthan',
    postalCode: '302001'
  }
  });
};

module.exports = {
  createOrder
};
