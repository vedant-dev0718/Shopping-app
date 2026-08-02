const router = require('express').Router();
const { body } = require('express-validator');

const { authenticate } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const shiprocket = require('../../utils/shiprocket');

router.use(authenticate);

router.post('/serviceability', [
  body('pickupPostalCode').trim().matches(/^[1-9]\d{5}$/).withMessage('Pincode must be 6 digits.'),
  body('deliveryPostalCode').trim().matches(/^[1-9]\d{5}$/).withMessage('Pincode must be 6 digits.'),
  body('weight').optional().isFloat({ min: 0.1, max: 50 }).withMessage('Weight must be between 0.1 and 50 kg'),
  body('cod').optional().isBoolean().withMessage('cod must be true or false')
], validate, asyncHandler(async (req, res) => {
  const { pickupPostalCode, deliveryPostalCode } = req.body;
  const weight = Number(req.body.weight || 0.5);
  const cod = req.body.cod === true;

  try {
    const result = await shiprocket.getServiceability(pickupPostalCode, deliveryPostalCode, weight, cod);
    const couriers = result?.data?.available_courier_companies || [];
    return successResponse(res, {
      message: couriers.length > 0 ? 'Shipping serviceability fetched' : 'No courier available for this route',
      data: {
        serviceable: couriers.length > 0,
        courierOptions: couriers,
        estimatedCharges: couriers.map((courier) => ({
          courierName: courier.courier_name || courier.courierName || '',
          rate: courier.rate || courier.freight_charge || courier.estimated_charges || null,
          etd: courier.etd || courier.estimated_delivery_days || ''
        })),
        raw: result
      }
    });
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Serviceability check failed';
    throw new AppError(message, 502);
  }
}));

module.exports = router;
