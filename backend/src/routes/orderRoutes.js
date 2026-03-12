const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, requireBuyer, requireFarmerOrBuyer } = require('../middleware/roleAuth');

// All order routes require authentication
router.use(authenticate);

router.post('/create', requireBuyer, orderController.createOrder);
router.get('/', requireFarmerOrBuyer, orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id/delivery-option', orderController.setDeliveryOption);
router.get('/:id/self-pickup-details', orderController.getSelfPickupDetails);
router.post('/:id/verify-self-pickup', orderController.verifySelfPickupStep);
router.put('/:id/cancel', requireBuyer, orderController.cancelOrder);

module.exports = router;
