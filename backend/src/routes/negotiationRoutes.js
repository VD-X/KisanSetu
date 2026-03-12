const express = require('express');
const router = express.Router();
const negotiationController = require('../controllers/negotiationController');
const { verifyJWT } = require('../middleware/authMiddleware');

// Start a new negotiation
router.post('/start', verifyJWT, negotiationController.startNegotiation);

// Get all negotiations for the current user
router.get('/my', verifyJWT, negotiationController.getMyNegotiations);

// Get a specific negotiation by ID
router.get('/:id', verifyJWT, negotiationController.getNegotiationById);

// Get messages for a negotiation
router.get('/:id/messages', verifyJWT, negotiationController.getMessages);

// Send a text message
router.post('/:id/messages', verifyJWT, negotiationController.sendMessage);

// Send a counter offer
router.post('/:id/counter', verifyJWT, negotiationController.sendOffer);

// Accept the current offer
router.post('/:id/accept', verifyJWT, negotiationController.acceptOffer);

// Reject the current offer
router.post('/:id/reject', verifyJWT, negotiationController.rejectOffer);

module.exports = router;
