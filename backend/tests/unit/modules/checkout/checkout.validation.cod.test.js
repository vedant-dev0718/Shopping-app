const { validationResult } = require('express-validator');
const { placeCodValidation, placeQrPaymentValidation } = require('../../../../src/modules/checkout/checkout.validation');

describe('checkout validation', () => {
  test.each([
    [placeCodValidation, 'COD'],
    [placeQrPaymentValidation, 'UPI_QR']
  ])('accepts only the endpoint method and a delivery address', async (validation, paymentMethod) => {
    const req = { body: { paymentMethod, deliveryAddressId: '507f1f77bcf86cd799439011' } };
    for (const rule of validation) await rule.run(req);
    expect(validationResult(req).isEmpty()).toBe(true);
    const invalid = { body: { paymentMethod: 'unsupported' } };
    for (const rule of validation) await rule.run(invalid);
    expect(validationResult(invalid).isEmpty()).toBe(false);
  });
});
