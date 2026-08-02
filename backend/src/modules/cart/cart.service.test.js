const assert = require('node:assert/strict');
const test = require('node:test');

const cartService = require('./cart.service');

test('recalculateCartTotals applies standard shipping below the free threshold', () => {
  const cart = {
    items: [
      { quantity: 2, priceSnapshot: 100 },
      { quantity: 1, priceSnapshot: 50 }
    ]
  };

  cartService.recalculateCartTotals(cart);

  assert.equal(cart.subtotal, 250);
  assert.equal(cart.shipping, cartService.SHIPPING_AMOUNT);
  assert.equal(cart.finalTotal, 349);
});

test('recalculateCartTotals makes shipping free at the threshold', () => {
  const cart = {
    items: [
      { quantity: 1, priceSnapshot: cartService.FREE_SHIPPING_THRESHOLD }
    ]
  };

  cartService.recalculateCartTotals(cart);

  assert.equal(cart.subtotal, cartService.FREE_SHIPPING_THRESHOLD);
  assert.equal(cart.shipping, 0);
  assert.equal(cart.finalTotal, cartService.FREE_SHIPPING_THRESHOLD);
});
