const router = require('express').Router();

const contentController = require('./content.controller');

router.get('/privacy-policy', contentController.getContentPage('privacy-policy'));
router.get('/terms-of-service', contentController.getContentPage('terms-of-service'));
router.get('/return-policy', contentController.getContentPage('return-policy'));
router.get('/shipping-policy', contentController.getContentPage('shipping-policy'));
router.get('/about', contentController.getContentPage('about'));
router.get('/faq', contentController.getContentPage('faq'));
router.get('/contact-support', contentController.getContentPage('contact-support'));

module.exports = router;
