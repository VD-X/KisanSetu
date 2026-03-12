const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { verifyJWT } = require('../middleware/authMiddleware');

// Optional: Require authentication
// router.use(verifyJWT);

router.post('/', routeController.calculateRoute);

module.exports = router;
