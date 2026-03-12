const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { verifyJWT } = require('../middleware/authMiddleware');

/**
 * GET /api/location/geocode
 * Proxy geocoding requests
 */
router.get('/geocode', locationController.geocode);

/**
 * GET /api/location/reverse-geocode
 * Proxy reverse geocoding requests
 */
router.get('/reverse-geocode', locationController.reverseGeocode);

// All routes below require authentication
router.use(verifyJWT);

/**
 * POST /api/location/calculate-distance
 * Calculate road distance between two coordinates
 * Body: { origin: { lat, lng }, destination: { lat, lng } }
 */
router.post('/calculate-distance', locationController.calculateDistance);

/**
 * PUT /api/location/update-profile
 * Update user's location in their profile
 * Body: { latitude, longitude, locationSource, address }
 */
router.put('/update-profile', locationController.updateProfile);

router.put('/update-farmer-profile', locationController.updateFarmerProfile);

router.post('/validate', locationController.validateCoordinates);

module.exports = router;
