const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/roleAuth');
const walletController = require('../controllers/walletController');

router.get('/my', authenticate, walletController.getMyWallet);
router.post('/add-funds', authenticate, walletController.addFunds);

module.exports = router;
