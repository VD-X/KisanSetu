// Notification API for chat messages
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Send notification to users
router.post('/send', async (req, res) => {
  try {
    const { userId, title, message, type, chatId } = req.body;
    
    // Validate required fields
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields: userId, title, message' });
    }

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'info',
        chatId,
        isRead: false,
        createdAt: new Date()
      }
    });

    console.log(`[NOTIFICATION] Created: ${title} for user ${userId}`);
    res.status(201).json(notification);
  } catch (error) {
    console.error('[NOTIFICATION] Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Get notifications for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        isRead: false
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(notifications);
  } catch (error) {
    console.error('[NOTIFICATION] Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[NOTIFICATION] Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

module.exports = router;
