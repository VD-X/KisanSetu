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

module.exports = router;
