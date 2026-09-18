const router = require('express').Router({ mergeParams: true });

const { authenticate } = require('../../middleware/auth.middleware');
const { requireBuyer } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const commentController = require('./comment.controller');
const {
  reelIdValidation,
  createCommentValidation
} = require('./comment.validation');

router.get('/', reelIdValidation, validate, commentController.listComments);
router.post('/', authenticate, requireBuyer, createCommentValidation, validate, commentController.createComment);

module.exports = router;
