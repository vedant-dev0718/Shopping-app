const router = require('express').Router();
const { body, param } = require('express-validator');

const { authenticate } = require('../../middleware/auth.middleware');
const { requireBuyer, requireSeller } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const asyncHandler = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/apiResponse');
const returnService = require('./return.service');

const returnReasons = ['wrong_item', 'damaged', 'not_as_described', 'changed_mind'];

router.post(
  '/',
  authenticate,
  requireBuyer,
  [
    body('orderId').isMongoId().withMessage('A valid order id is required'),
    body('itemId').isMongoId().withMessage('A valid order item id is required'),
    body('reason').isIn(returnReasons).withMessage('Invalid return reason'),
    body('description')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be 500 characters or fewer')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const returnRequest = await returnService.requestReturn(req.user.id, req.body);

    return successResponse(res, {
      statusCode: 201,
      message: 'Return requested successfully',
      data: returnRequest
    });
  })
);

router.get('/my', authenticate, requireBuyer, asyncHandler(async (req, res) => {
  const returns = await returnService.getReturnsByBuyer(req.user.id);

  return successResponse(res, {
    message: 'Returns fetched successfully',
    data: returns
  });
}));

router.patch(
  '/:id/resolve',
  authenticate,
  requireSeller,
  [
    param('id').isMongoId().withMessage('A valid return id is required'),
    body('approved').isBoolean().withMessage('approved must be a boolean').toBoolean(),
    body('rejectionReason')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 500 })
      .withMessage('Rejection reason must be 500 characters or fewer')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const returnRequest = await returnService.resolveReturn(req.user.id, req.params.id, req.body);

    return successResponse(res, {
      message: 'Return resolved successfully',
      data: returnRequest
    });
  })
);

module.exports = router;
