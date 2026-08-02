const { body, param } = require('express-validator');

const reelIdValidation = [
  param('id').isMongoId().withMessage('A valid reel id is required')
];

const createCommentValidation = [
  param('id').isMongoId().withMessage('A valid reel id is required'),
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ max: 500 })
    .withMessage('Comment text cannot exceed 500 characters')
];

module.exports = {
  reelIdValidation,
  createCommentValidation
};
