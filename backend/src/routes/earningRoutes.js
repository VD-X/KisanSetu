const express = require('express');
const router = express.Router();
const earningController = require('../controllers/earningController');
const { authenticate, requireTransporter } = require('../middleware/roleAuth');

router.use(authenticate);
router.use(requireTransporter);

router.get('/summary', earningController.getSummary);
router.get('/', earningController.getEarnings);

module.exports = router;

