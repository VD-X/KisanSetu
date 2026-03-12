const express = require('express');
const router = express.Router();
const { submitReview, getPublicProfile } = require('../controllers/reviewController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.post('/', verifyJWT, submitReview);
router.get('/:role/:id', getPublicProfile);

module.exports = router;