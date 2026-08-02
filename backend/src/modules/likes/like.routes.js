const router = require('express').Router({ mergeParams: true });

const { authenticate } = require('../../middleware/auth.middleware');
const { requireBuyer } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const { reelIdValidation } = require('../reels/reel.validation');
const likeController = require('./like.controller');

router.post('/', authenticate, requireBuyer, reelIdValidation, validate, likeController.likeReel);
router.delete('/', authenticate, requireBuyer, reelIdValidation, validate, likeController.unlikeReel);

module.exports = router;
