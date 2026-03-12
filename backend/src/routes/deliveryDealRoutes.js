const express = require('express');
const router = express.Router();
const deliveryDealController = require('../controllers/deliveryDealController');
const { authenticate, requireTransporter, requireFarmerOrBuyer } = require('../middleware/roleAuth');

// All delivery routes require authentication
router.use(authenticate);

router.post('/create', requireFarmerOrBuyer, deliveryDealController.createDeliveryDeal);
router.get('/my', deliveryDealController.getMyDeliveries);
router.get('/available', requireTransporter, deliveryDealController.getAvailableDeals);
// Specific routes before parameterized routes to avoid conflicts
router.get('/:id/tracking', deliveryDealController.getTracking);
router.post('/:id/pay', deliveryDealController.payForDeliveryDeal);
router.post('/:id/accept', requireTransporter, deliveryDealController.acceptDeal);
router.post('/:id/decline', requireTransporter, deliveryDealController.declineDeal);
router.put('/:id/location', requireTransporter, deliveryDealController.updateTransporterLocation);
router.post('/:id/proof-photo', requireTransporter, deliveryDealController.uploadProofPhoto);
router.post('/:id/verify-otp', requireTransporter, deliveryDealController.verifyOtp);
router.put('/:id/status', requireTransporter, deliveryDealController.updateStatus);
router.post('/:id/start-location-sharing', requireFarmerOrBuyer, deliveryDealController.startLocationSharing);
router.get('/:id', deliveryDealController.getDeliveryById);

module.exports = router;
