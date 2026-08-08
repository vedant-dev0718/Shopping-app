const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const bargainService = require('./bargain.service');

const scheduleBargain = asyncHandler(async (req, res) => {
  const schedule = await bargainService.scheduleBargain(req.user, req.params.productId, req.body);

  return successResponse(res, {
    statusCode: 201,
    message: 'Bargain schedule created successfully',
    data: schedule
  });
});

const createBidOrder = asyncHandler(async (req, res) => {
  const order = await bargainService.createBidOrder(req.user, req.params.productId, req.body);

  return successResponse(res, {
    statusCode: 201,
    message: 'Bid order created successfully',
    data: order
  });
});

const placeBid = asyncHandler(async (req, res) => {
  const bid = await bargainService.placeBid(req.user, req.params.productId, req.body);

  return successResponse(res, {
    statusCode: 201,
    message: 'Bid placed successfully',
    data: bid
  });
});

const acceptBid = asyncHandler(async (req, res) => {
  const result = await bargainService.acceptBid(req.user, req.params.productId, req.params.bidId);

  return successResponse(res, {
    message: 'Bid accepted successfully',
    data: result.acceptedBid
  });
});

const closeBidPaymentWindow = asyncHandler(async (req, res) => {
  const result = await bargainService.closeBidPaymentWindow(req.user, req.params.productId, req.params.bidId);

  return successResponse(res, {
    message: 'Bid payment window closed successfully',
    data: result.bid
  });
});

const reopenBidNegotiation = asyncHandler(async (req, res) => {
  const result = await bargainService.reopenBidNegotiation(req.user, req.params.productId, req.params.bidId);

  return successResponse(res, {
    message: 'Bid negotiation reopened successfully',
    data: result.bid
  });
});

const getProductBids = asyncHandler(async (req, res) => {
  const bids = await bargainService.getProductBids(req.user, req.params.productId);

  return successResponse(res, {
    message: 'Product bids fetched successfully',
    data: bids
  });
});

const getMyBids = asyncHandler(async (req, res) => {
  const bids = await bargainService.getBuyerBids(req.user);

  return successResponse(res, {
    message: 'Buyer bids fetched successfully',
    data: bids
  });
});

const closeBargain = asyncHandler(async (req, res) => {
  const data = await bargainService.closeBargain(req.user, req.params.productId);

  return successResponse(res, {
    message: 'Bargain closed successfully',
    data
  });
});

const withdrawBid = asyncHandler(async (req, res) => {
  const bid = await bargainService.withdrawBid(req.user, req.params.bidId);

  return successResponse(res, {
    message: 'Bid withdrawn successfully',
    data: bid
  });
});

const getActiveBargains = asyncHandler(async (_req, res) => {
  const bargains = await bargainService.getActiveBargains();

  return successResponse(res, {
    message: 'Active bargain products fetched successfully',
    data: bargains
  });
});

module.exports = {
  scheduleBargain,
  createBidOrder,
  placeBid,
  acceptBid,
  closeBidPaymentWindow,
  reopenBidNegotiation,
  getMyBids,
  getProductBids,
  closeBargain,
  withdrawBid,
  getActiveBargains
};
