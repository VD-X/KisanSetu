const express = require('express');
const router = express.Router();
const marketPriceController = require('../controllers/marketPriceController');
const { verifyJWT, optionalJWT } = require('../middleware/authMiddleware');

// Get today's market prices for all crops (public but reads token if exists)
router.get('/daily', optionalJWT, marketPriceController.getDailyPrices);

// Get price for a specific crop (public but reads token if exists)
router.get('/crop/:cropId', optionalJWT, marketPriceController.getCropPrice);

// Get historical prices for charts (public but reads token if exists)
router.get('/history/:cropId', optionalJWT, marketPriceController.getHistoricalPrices);

// Get smart price suggestion for a listing (requires auth)
router.get('/suggestion', verifyJWT, marketPriceController.getPriceSuggestion);

// Admin: Force refresh prices (clear cache) (requires auth)
router.post('/refresh', verifyJWT, marketPriceController.refreshPrices);

module.exports = router;
