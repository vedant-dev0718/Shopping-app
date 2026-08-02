const sellerOrderService = require('../../src/modules/sellerOrders/sellerOrder.service');

describe('seller order status computation', () => {
  test('marks all-cancelled seller items as cancelled', () => {
    expect(sellerOrderService.computeOrderStatus([
      { itemStatus: 'cancelled' },
      { itemStatus: 'cancelled' }
    ])).toBe('cancelled');
  });

  test('marks mixed delivered/cancelled seller items as partially delivered', () => {
    expect(sellerOrderService.computeOrderStatus([
      { itemStatus: 'delivered' },
      { itemStatus: 'cancelled' }
    ])).toBe('partially_delivered');
  });

  test('keeps shipped status when any seller item is shipped', () => {
    expect(sellerOrderService.computeOrderStatus([
      { itemStatus: 'processing' },
      { itemStatus: 'shipped' }
    ])).toBe('shipped');
  });
});
