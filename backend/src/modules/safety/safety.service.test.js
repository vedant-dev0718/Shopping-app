const assert = require('node:assert/strict');
const test = require('node:test');

const safetyService = require('./safety.service');

const fakeId = (value) => ({
  value,
  toString() {
    return value;
  }
});

test('applySafetyQuery merges hidden content and blocked owner filters into existing query operators', () => {
  const hiddenProductId = fakeId('reported-product');
  const blockedSellerId = fakeId('blocked-seller');

  const query = safetyService.applySafetyQuery(
    {
      _id: { $ne: fakeId('current-product') },
      sellerId: fakeId('current-seller'),
      status: { $in: ['active', 'sold_out'] }
    },
    {
      hiddenIdsByType: {
        product: [hiddenProductId]
      },
      hiddenOwnerIds: [blockedSellerId]
    },
    { targetType: 'product' }
  );

  assert.deepEqual(query._id.$nin, [hiddenProductId]);
  assert.equal(query._id.$ne.toString(), 'current-product');
  assert.deepEqual(query.sellerId.$nin, [blockedSellerId]);
  assert.equal(query.sellerId.$eq.toString(), 'current-seller');
  assert.deepEqual(query.status, { $in: ['active', 'sold_out'] });
});

test('filterSafeItems removes reported items and content from blocked owners', () => {
  const visible = {
    _id: fakeId('visible-product'),
    sellerId: fakeId('visible-seller')
  };
  const reported = {
    _id: fakeId('reported-product'),
    sellerId: fakeId('visible-seller')
  };
  const blockedOwner = {
    _id: fakeId('owner-product'),
    sellerId: fakeId('blocked-seller')
  };

  const result = safetyService.filterSafeItems(
    [visible, reported, blockedOwner],
    {
      hiddenIdsByType: {
        product: [fakeId('reported-product')]
      },
      hiddenOwnerIds: [fakeId('blocked-seller')]
    },
    { targetType: 'product' }
  );

  assert.deepEqual(result, [visible]);
});
