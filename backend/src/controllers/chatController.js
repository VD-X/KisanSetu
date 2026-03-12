const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Send notification to all participants when new message is sent
const sendChatNotification = async (chatId, message, io) => {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: true
      }
    });

    if (chat && chat.participants) {
      // Send notification to all participants except sender
      const notificationPromises = chat.participants
        .filter(participantId => participantId !== message.senderId)
        .map(participantId => {
          return fetch('/api/notifications/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'default-token'}`
            },
            body: JSON.stringify({
              userId: participantId,
              title: 'New Message',
              message: `${message.sender?.name || 'Someone'}: ${message.text}`,
              type: message.type === 'OFFER' ? 'new_offer' : 'new_message',
              chatId: chatId
            })
          });
        });

      await Promise.allSettled(notificationPromises);
      console.log(`[CHAT NOTIFICATION] Sent notifications to ${notificationPromises.length} participants for chat ${chatId}`);
    }
  } catch (error) {
    console.error('[CHAT NOTIFICATION] Failed to send notifications:', error);
  }
};

// Create or get chat for an order
exports.getOrCreateChat = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Get order details to find participants
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: {
          include: { farmer: true }
        },
        buyer: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user is participant
    const participants = [order.listing.farmer.id, order.buyer.id];
    if (!participants.includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find existing chat
    let chat = await prisma.chat.findFirst({
      where: { orderId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // Create new chat if doesn't exist
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          orderId,
          participants
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
    }

    // Get io instance
    const io = req.app.get('io');

    res.json(chat);
  } catch (error) {
    console.error('Error in getOrCreateChat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all chats for a user
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          has: userId
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        order: {
          include: {
            listing: {
              include: { farmer: true }
            },
            buyer: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(chats);
  } catch (error) {
    console.error('Error in getUserChats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, text, type = 'TEXT', offerAmount } = req.body;
    const senderId = req.user.id;

    // Verify chat exists and user is participant
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: {
          has: senderId
        }
      }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId,
        text,
        type: type.toUpperCase(),
        offerAmount: type === 'OFFER' ? offerAmount : null,
        offerStatus: type === 'OFFER' ? 'PENDING' : null
      }
    });

    // Update chat's last message
    await prisma.chat.update({
      where: { id: chatId },
      data: {
        lastMessage: text,
        updatedAt: new Date()
      }
    });

    // Get io instance
    const io = req.app.get('io');

    // Send notification to other participants
    await sendChatNotification(chatId, message, io);

    // Get message with sender details
    const messageWithSender = await prisma.message.findUnique({
      where: { id: message.id },
      include: {
        chat: {
          include: {
            participants: true
          }
        }
      }
    });

    res.json(messageWithSender);
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Handle offer response (accept/reject)
exports.respondToOffer = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body; // 'ACCEPTED' or 'REJECTED'
    const userId = req.user.id;

    // Get message with chat details
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        type: 'OFFER'
      },
      include: {
        chat: {
          include: {
            participants: true,
            order: {
              include: {
                listing: true
              }
            }
          }
        }
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Check if user is participant (but not the sender)
    if (!message.chat.participants.includes(userId) || message.senderId === userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update offer status
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        offerStatus: status.toUpperCase()
      }
    });

    // If accepted, update order price
    if (status.toUpperCase() === 'ACCEPTED') {
      await prisma.order.update({
        where: { id: message.chat.orderId },
        data: {
          priceFinal: message.offerAmount
        }
      });
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error in respondToOffer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get chat messages
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify chat exists and user is participant
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: {
          has: userId
        }
      }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error('Error in getChatMessages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
