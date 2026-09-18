const { successResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const commentService = require('./comment.service');

const listComments = asyncHandler(async (req, res) => {
  const comments = await commentService.getCommentsForReel(req.params.id, req.user);

  return successResponse(res, {
    message: 'Comments fetched successfully',
    data: comments
  });
});

const createComment = asyncHandler(async (req, res) => {
  const data = await commentService.createComment(req.params.id, req.user, req.body.text);

  return successResponse(res, {
    statusCode: 201,
    message: 'Comment created successfully',
    data
  });
});

module.exports = {
  listComments,
  createComment
};
