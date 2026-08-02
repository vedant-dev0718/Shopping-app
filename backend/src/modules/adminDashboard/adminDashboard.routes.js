const router = require('express').Router();

const adminDashboardController = require('./adminDashboard.controller');

router.get('/summary', adminDashboardController.summary);

module.exports = router;
