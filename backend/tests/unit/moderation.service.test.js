const safetyService = require('../../src/modules/safety/safety.service');

const fakeId = (value) => ({
  value,
  toString() {
    return value;
  }
});

describe('safety and moderation helpers', () => {
  test('applySafetyQuery merges blocked owners and hidden ids into existing filters', () => {
    const query = safetyService.applySafetyQuery(
      {
        _id: { $ne: fakeId('current-product') },
        sellerId: fakeId('current-seller'),
        status: { $in: ['active', 'sold_out'] }
      },
      {
        hiddenIdsByType: { product: [fakeId('reported-product')] },
        hiddenOwnerIds: [fakeId('blocked-seller')]
      },
      { targetType: 'product' }
    );

    expect(query._id.$nin[0].toString()).toBe('reported-product');
    expect(query.sellerId.$eq.toString()).toBe('current-seller');
    expect(query.sellerId.$nin[0].toString()).toBe('blocked-seller');
  });

  test('filterSafeItems removes reported content and blocked owners', () => {
    const visible = { _id: fakeId('visible'), sellerId: fakeId('seller') };
    const reported = { _id: fakeId('reported'), sellerId: fakeId('seller') };
    const blocked = { _id: fakeId('blocked-content'), sellerId: fakeId('blocked-seller') };

    const result = safetyService.filterSafeItems(
      [visible, reported, blocked],
      {
        hiddenIdsByType: { product: [fakeId('reported')] },
        hiddenOwnerIds: [fakeId('blocked-seller')]
      },
      { targetType: 'product' }
    );

    expect(result).toEqual([visible]);
  });
});
