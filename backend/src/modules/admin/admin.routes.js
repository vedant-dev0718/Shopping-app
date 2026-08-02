const router = require('express').Router();
const { body, param } = require('express-validator');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const adminController = require('./admin.controller');
const adminAnalyticsRoutes = require('../adminAnalytics/adminAnalytics.routes');
const adminToolsRoutes = require('../adminTools/adminTools.routes');
const dashboardRoutes = require('../adminDashboard/adminDashboard.routes');
const managementRoutes = require('../adminManagement/adminManagement.routes');
const operationsRoutes = require('../adminOperations/adminOperations.routes');
const searchRoutes = require('../adminSearch/adminSearch.routes');
const { requireAuth, requireAdmin } = require('./admin.middleware');
const { adminLoginValidation } = require('./admin.validation');
const { successResponse } = require('../../utils/apiResponse');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const SellerProfile = require('../sellers/sellerProfile.model');
const { activateSellerLinkedAccount, onboardSellerToRazorpay } = require('../sellers/sellerPayout.service');
const financeService = require('../finance/finance.service');
const postOrderService = require('../orders/postOrder.service');
const sellerOrderService = require('../sellerOrders/sellerOrder.service');
const safetyController = require('../safety/safety.controller');
const {
  listReportsValidation,
  resolveReportValidation
} = require('../safety/safety.validation');
const validate = require('../../middleware/validate.middleware');

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();

    return `${email || 'unknown'}:${ipKeyGenerator(req.ip)}`;
  },
  message: {
    success: false,
    message: 'Too many failed admin login attempts. Try again after 15 minutes.'
  }
});

router.post('/login', adminLoginLimiter, adminLoginValidation, validate, adminController.login);

router.use(requireAuth, requireAdmin);

router.get('/me', adminController.me);
router.use('/analytics', adminAnalyticsRoutes);
router.use(adminToolsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/search', searchRoutes);
router.use(managementRoutes);
router.use(operationsRoutes);

router.get('/moderation/reports', listReportsValidation, validate, safetyController.listReports);
router.patch('/moderation/reports/:id/resolve', resolveReportValidation, validate, safetyController.resolveReport);

router.get('/analytics/platform', asyncHandler(async (req, res) => {
  const analytics = await financeService.getPlatformAnalytics(req.query);

  return successResponse(res, {
    message: 'Platform analytics fetched',
    data: analytics
  });
}));

router.get('/commission-settings', asyncHandler(async (_req, res) => {
  const settings = await financeService.getCommissionSettings();

  return successResponse(res, {
    message: 'Commission settings fetched',
    data: settings
  });
}));

router.patch(
  '/commission-settings',
  [
    body('globalCommissionPercentage')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Global commission must be between 0 and 100'),
    body('sellerOverrides')
      .optional()
      .isArray()
      .withMessage('sellerOverrides must be an array'),
    body('sellerOverrides.*.sellerId')
      .optional()
      .isMongoId()
      .withMessage('Seller override sellerId must be valid'),
    body('sellerOverrides.*.commissionPercentage')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Seller commission override must be between 0 and 100')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const settings = await financeService.updateCommissionSettings(req.user.id, req.body);

    return successResponse(res, {
      message: 'Commission settings updated',
      data: settings
    });
  })
);

router.get('/payouts', asyncHandler(async (req, res) => {
  const payouts = await financeService.listAdminPayouts(req.query);

  return successResponse(res, {
    message: 'Payouts fetched',
    data: payouts
  });
}));

router.post(
  '/payouts/:sellerId/create',
  [
    param('sellerId').isMongoId().withMessage('A valid seller id is required'),
    body('periodStart').optional().isISO8601().withMessage('periodStart must be a valid ISO date'),
    body('periodEnd').optional().isISO8601().withMessage('periodEnd must be a valid ISO date'),
    body('paymentMethod').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
    body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const payout = await financeService.createSellerPayout(req.params.sellerId, req.body);

    return successResponse(res, {
      statusCode: 201,
      message: 'Seller payout created',
      data: payout
    });
  })
);

router.patch(
  '/payouts/:payoutId/mark-paid',
  [
    param('payoutId').isMongoId().withMessage('A valid payout id is required'),
    body('transactionReference').optional({ checkFalsy: true }).trim().isLength({ max: 180 }),
    body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const payout = await financeService.markPayoutStatus(req.params.payoutId, 'paid', req.body);

    return successResponse(res, {
      message: 'Payout marked paid',
      data: payout
    });
  })
);

router.patch(
  '/payouts/:payoutId/mark-failed',
  [
    param('payoutId').isMongoId().withMessage('A valid payout id is required'),
    body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const payout = await financeService.markPayoutStatus(req.params.payoutId, 'failed', req.body);

    return successResponse(res, {
      message: 'Payout marked failed',
      data: payout
    });
  })
);

router.get('/cancellations', asyncHandler(async (_req, res) => {
  const cancellations = await postOrderService.listCancellations();

  return successResponse(res, {
    message: 'Cancellation requests fetched',
    data: cancellations
  });
}));

router.get('/returns', asyncHandler(async (_req, res) => {
  const returns = await postOrderService.listReturns();

  return successResponse(res, {
    message: 'Return requests fetched',
    data: returns
  });
}));

router.get('/refunds', asyncHandler(async (_req, res) => {
  const refunds = await postOrderService.listRefunds();

  return successResponse(res, {
    message: 'Refunds fetched',
    data: refunds
  });
}));

router.get('/orders/pending-acceptance', asyncHandler(async (_req, res) => {
  const orders = await sellerOrderService.listPendingAcceptanceForAdmin();

  return successResponse(res, {
    message: 'Pending acceptance orders fetched',
    data: orders
  });
}));

router.patch(
  '/orders/:orderId/force-accept',
  [param('orderId').isMongoId().withMessage('A valid order id is required')],
  validate,
  asyncHandler(async (req, res) => {
    const order = await sellerOrderService.forceAcceptOrder(req.user.id, req.params.orderId);

    return successResponse(res, {
      message: 'Order force accepted',
      data: order
    });
  })
);

router.patch(
  '/orders/:orderId/force-cancel',
  [
    param('orderId').isMongoId().withMessage('A valid order id is required'),
    body('reason')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason must be 500 characters or fewer')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const order = await sellerOrderService.forceCancelOrder(
      req.user.id,
      req.params.orderId,
      req.body.reason || 'Order cancelled by admin'
    );

    return successResponse(res, {
      message: 'Order force cancelled',
      data: order
    });
  })
);

router.post('/orders/process-expired-acceptance', asyncHandler(async (_req, res) => {
  const orders = await sellerOrderService.processExpiredAcceptanceOrders();

  return successResponse(res, {
    message: 'Expired acceptance orders processed',
    data: orders
  });
}));

router.patch(
  '/cancellations/:orderId/approve',
  [param('orderId').isMongoId().withMessage('A valid order id is required')],
  validate,
  asyncHandler(async (req, res) => {
    const order = await postOrderService.approveCancellation(req.user.id, req.params.orderId, 'admin');

    return successResponse(res, {
      message: 'Cancellation approved',
      data: order
    });
  })
);

router.patch(
  '/cancellations/:orderId/reject',
  [
    param('orderId').isMongoId().withMessage('A valid order id is required'),
    body('rejectionReason')
      .trim()
      .notEmpty()
      .withMessage('Rejection reason is required')
      .isLength({ max: 500 })
      .withMessage('Rejection reason must be 500 characters or fewer')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const order = await postOrderService.rejectCancellation(
      req.user.id,
      req.params.orderId,
      req.body.rejectionReason,
      'admin'
    );

    return successResponse(res, {
      message: 'Cancellation rejected',
      data: order
    });
  })
);

router.patch(
  '/returns/:returnId/approve',
  [param('returnId').isMongoId().withMessage('A valid return id is required')],
  validate,
  asyncHandler(async (req, res) => {
    const returnRequest = await postOrderService.reviewReturn(req.user.id, req.params.returnId, { approved: true }, 'admin');

    return successResponse(res, {
      message: 'Return approved',
      data: returnRequest
    });
  })
);

router.patch(
  '/returns/:returnId/reject',
  [
    param('returnId').isMongoId().withMessage('A valid return id is required'),
    body('rejectionReason')
      .trim()
      .notEmpty()
      .withMessage('Rejection reason is required')
      .isLength({ max: 500 })
      .withMessage('Rejection reason must be 500 characters or fewer')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const returnRequest = await postOrderService.reviewReturn(
      req.user.id,
      req.params.returnId,
      {
        approved: false,
        rejectionReason: req.body.rejectionReason
      },
      'admin'
    );

    return successResponse(res, {
      message: 'Return rejected',
      data: returnRequest
    });
  })
);

router.patch(
  '/refunds/:refundId/process',
  [param('refundId').isMongoId().withMessage('A valid refund id is required')],
  validate,
  asyncHandler(async (req, res) => {
    const refund = await postOrderService.markRefund(req.params.refundId, 'processing');

    return successResponse(res, {
      message: 'Refund marked processing',
      data: refund
    });
  })
);

router.patch(
  '/refunds/:refundId/mark-refunded',
  [param('refundId').isMongoId().withMessage('A valid refund id is required')],
  validate,
  asyncHandler(async (req, res) => {
    const refund = await postOrderService.markRefund(req.params.refundId, 'refunded');

    return successResponse(res, {
      message: 'Refund marked refunded',
      data: refund
    });
  })
);

router.patch(
  '/refunds/:refundId/mark-failed',
  [
    param('refundId').isMongoId().withMessage('A valid refund id is required'),
    body('failureReason')
      .trim()
      .notEmpty()
      .withMessage('Failure reason is required')
      .isLength({ max: 500 })
      .withMessage('Failure reason must be 500 characters or fewer')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const refund = await postOrderService.markRefund(req.params.refundId, 'failed', req.body.failureReason);

    return successResponse(res, {
      message: 'Refund marked failed',
      data: refund
    });
  })
);

router.get('/sellers/kyc/pending', asyncHandler(async (_req, res) => {
  const profiles = await SellerProfile.find({ kycStatus: 'pending' })
    .populate('userId', 'name email phone')
    .lean();

  return successResponse(res, {
    message: 'Pending KYC submissions fetched',
    data: profiles.map((p) => ({
      sellerId: p.userId._id,
      name: p.userId.name,
      email: p.userId.email,
      storeName: p.storeName,
      kycStatus: p.kycStatus,
      panNumber: p.panNumber,
      gstNumber: p.gstNumber,
      bankAccount: p.bankAccount,
      razorpayLinkedAccountStatus: p.razorpayLinkedAccountStatus,
      submittedAt: p.updatedAt || p.createdAt
    }))
  });
}));

router.patch('/sellers/:sellerId/kyc/approve', asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const profile = await SellerProfile.findOne({ userId: sellerId });

  if (!profile) {
    throw new AppError('Seller profile not found', 404);
  }

  if (profile.kycStatus !== 'pending') {
    throw new AppError(`Cannot approve — current KYC status is '${profile.kycStatus}'`, 400);
  }

  profile.kycStatus = 'verified';
  profile.bankAccount = profile.bankAccount || {};
  profile.bankAccount.isVerified = true;
  await profile.save();

  try {
    await onboardSellerToRazorpay(sellerId);
    await activateSellerLinkedAccount(sellerId);
  } catch (error) {
    console.error(`Razorpay onboarding failed for seller ${sellerId}:`, error.message);
  }

  return successResponse(res, {
    message: 'Seller KYC approved and Razorpay account activated',
    data: {
      sellerId,
      kycStatus: profile.kycStatus,
      razorpayLinkedAccountStatus: profile.razorpayLinkedAccountStatus
    }
  });
}));

router.patch('/sellers/:sellerId/kyc/reject', asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new AppError('Rejection reason is required', 400);
  }

  const profile = await SellerProfile.findOne({ userId: sellerId });

  if (!profile) {
    throw new AppError('Seller profile not found', 404);
  }

  if (profile.kycStatus !== 'pending') {
    throw new AppError(`Cannot reject — current KYC status is '${profile.kycStatus}'`, 400);
  }

  profile.kycStatus = 'rejected';
  await profile.save();

  return successResponse(res, {
    message: 'Seller KYC rejected',
    data: { sellerId, kycStatus: profile.kycStatus, reason }
  });
}));

router.get('/sellers/payouts/manual-pending', asyncHandler(async (_req, res) => {
  const PendingManualPayout = require('../checkout/pendingManualPayout.model');
  const payouts = await PendingManualPayout.find({ status: 'pending' })
    .populate('orderId', 'orderNumber finalTotal createdAt')
    .populate('sellerId', 'name email')
    .lean();

  return successResponse(res, {
    message: 'Pending manual payouts fetched',
    data: payouts
  });
}));

router.patch('/sellers/payouts/manual-pending/:payoutId/resolve', asyncHandler(async (req, res) => {
  const PendingManualPayout = require('../checkout/pendingManualPayout.model');
  const payout = await PendingManualPayout.findById(req.params.payoutId);

  if (!payout) {
    throw new AppError('Payout record not found', 404);
  }

  payout.status = 'resolved';
  await payout.save();

  return successResponse(res, {
    message: 'Manual payout marked as resolved',
    data: payout
  });
}));

module.exports = router;
