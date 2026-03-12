const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate, requireFarmer } = require('../middleware/roleAuth');

// router.post('/verify-harvest', authenticate, requireFarmer, aiController.verifyHarvest);
// router.post('/verify-crop', authenticate, requireFarmer, aiController.verifyCrop);
router.get('/market-price', authenticate, requireFarmer, aiController.getMarketPrice);
router.get('/recommendations', authenticate, requireFarmer, aiController.getMarketPriceRecommendations);
// router.post('/quality-grade', authenticate, requireFarmer, aiController.getQualityGrade);
router.post('/vision-detect', authenticate, requireFarmer, aiController.visionDetect);
// router.post('/grade-summary', authenticate, requireFarmer, aiController.gradeSummary);

// Map analyze-crop-images to analyzeCropImages if needed, or keep it as is if defined
router.post('/analyze-crop-images', authenticate, requireFarmer, aiController.analyzeCropImages);
router.post('/chat', authenticate, aiController.chatWithAI);

module.exports = router;
