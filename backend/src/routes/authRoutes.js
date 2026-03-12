const express = require('express');
const router = express.Router();
const { signup, login, getMe, updateProfile, firebaseLogin, otplessLogin, adminLogin } = require('../controllers/authController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.post('/firebase-login', firebaseLogin);
router.post('/otpless-login', otplessLogin);
router.get('/me', verifyJWT, getMe);
router.put('/profile', verifyJWT, updateProfile);

const admin = require('../config/firebaseAdmin');

router.get('/status', (req, res) => {
    res.json({
        service: 'auth',
        firebaseReady: admin.isReady(),
        time: new Date().toISOString()
    });
});

module.exports = router;
