const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyJWT } = require('../middleware/authMiddleware');

// Get or create chat for an order
router.get('/order/:orderId', verifyJWT, chatController.getOrCreateChat);

// Get all chats for a user
router.get('/user', verifyJWT, chatController.getUserChats);

// Get chat messages
router.get('/:chatId/messages', verifyJWT, chatController.getChatMessages);

// Get all messages for a chat (alternative route)
router.get('/messages/:chatId', verifyJWT, chatController.getChatMessages);

// Send message
router.post('/send', verifyJWT, chatController.sendMessage);

// Respond to offer
router.put('/offer/:messageId/respond', verifyJWT, chatController.respondToOffer);

module.exports = router;
