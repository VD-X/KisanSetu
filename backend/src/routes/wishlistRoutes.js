const express = require('express');

const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { authenticate } = require('../middleware/roleAuth');

router.use(authenticate);

router.get('/', wishlistController.getWishlist);
router.post('/add', wishlistController.addToWishlist);
router.delete('/remove/:listingId', wishlistController.removeFromWishlist);
router.get('/check/:listingId', (req, res) => {
    // This is a placeholder if we need a specific check, but getWishlist is usually better for batch checks
    res.status(501).json({ message: 'Not implemented, use / to get all IDs' });
});

module.exports = router;
