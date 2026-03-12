const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const { authenticate, requireFarmer } = require('../middleware/roleAuth');

// Public routes (no auth required)
router.get('/', listingController.getAllListings); // Get all available listings (for buyers)
router.get('/search', listingController.searchListings); // Search listings
router.get('/crops', listingController.getAllCrops); // Get all crops
router.get('/my/listings', authenticate, requireFarmer, listingController.getMyListings); // Get farmer's listings

// Farmer-only routes
router.post('/', authenticate, requireFarmer, listingController.createListing); // Create listing
router.put('/:id', authenticate, requireFarmer, listingController.updateListing); // Update listing
router.delete('/:id', authenticate, requireFarmer, listingController.deleteListing); // Delete listing

router.get('/:id', listingController.getListingById); // Get single listing

module.exports = router;
