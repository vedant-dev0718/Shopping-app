const express = require('express');
const router = express.Router();

const { handleMediaConvertJobStatus } = require('./mediaconvert.webhook');

/**
 * POST /api/webhooks/mediaconvert/job-status
 * AWS MediaConvert job status notifications via SNS
 * This endpoint receives updates for all transcoding jobs
 */
router.post('/mediaconvert/job-status', handleMediaConvertJobStatus);

module.exports = router;
