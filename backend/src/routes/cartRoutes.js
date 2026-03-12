const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate, requireBuyer } = require('../middleware/roleAuth');

// All cart routes require authentication and buyer role
router.use(authenticate);
router.use(requireBuyer);

router.post('/add', cartController.addToCart);
router.get('/', cartController.getCart);
router.put('/update/:itemId', cartController.updateCartItem);
router.delete('/remove/:itemId', cartController.removeFromCart);
router.post('/checkout', cartController.checkout);

module.exports = router;
