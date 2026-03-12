const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Start a new negotiation (Buyer → Farmer) ───────────────────────────────
exports.startNegotiation = async (req, res) => {
    try {
        const { listingId, quantity, initialOffer } = req.body;
        const buyerId = req.user.id;

        if (!listingId || !quantity || !initialOffer) {
            return res.status(400).json({ error: 'listingId, quantity, and initialOffer are required' });
        }

        // Get listing to find the farmer
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            include: { farmer: true }
        });

        if (!listing) return res.status(404).json({ error: 'Listing not found' });
        if (listing.status !== 'AVAILABLE') return res.status(400).json({ error: 'Listing is not available' });
        if (listing.farmerId === buyerId) return res.status(400).json({ error: 'Cannot negotiate on your own listing' });
        if (quantity > listing.quantity) return res.status(400).json({ error: `Only ${listing.quantity} kg available` });

        // Check for existing open negotiation
        const existing = await prisma.negotiatingChat.findFirst({
            where: {
                listingId,
                buyerId,
                status: { in: ['OPEN', 'COUNTER'] }
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'You already have an active negotiation for this listing', chatId: existing.id });
        }

        // Create the negotiation chat
        const chat = await prisma.negotiatingChat.create({
            data: {
                listingId,
                buyerId,
                farmerId: listing.farmerId,
                requestedQuantity: quantity,
                currentOffer: initialOffer,
                status: 'OPEN',
                lastMessage: `Offer: ₹${initialOffer}/kg for ${quantity} kg`
            }
        });

        // Create the initial offer message
        await prisma.negotiationMessage.create({
            data: {
                chatId: chat.id,
                senderId: buyerId,
                text: `Offer: ₹${initialOffer}/kg for ${quantity} kg`,
                type: 'OFFER',
                offerValue: initialOffer,
                offerStatus: 'pending'
            }
        });

        // Notify farmer via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`user-${listing.farmerId}`).emit('negotiation:new', {
                chatId: chat.id,
                buyerId,
                listingId,
                quantity,
                offer: initialOffer
            });
        }

        // Create persistent notification for farmer
        await prisma.notification.create({
            data: {
                userId: listing.farmerId,
                title: 'New Negotiation Started',
                message: `New offer for ${listing.crop ? listing.crop.name : 'Crop'}: ₹${initialOffer}/kg for ${quantity} kg`,
                type: 'negotiation_new',
                chatId: chat.id
            }
        });

        // Return full chat with messages
        const fullChat = await prisma.negotiatingChat.findUnique({
            where: { id: chat.id },
            include: {
                listing: { include: { crop: true, farmer: { include: { farmerProfile: true } } } },
                buyer: { include: { buyerProfile: true } },
                farmer: { include: { farmerProfile: true } },
                messages: { orderBy: { createdAt: 'asc' } }
            }
        });

        res.status(201).json(fullChat);
    } catch (error) {
        console.error('Error starting negotiation:', error);

        res.status(500).json({ error: 'Failed to start negotiation' });
    }
};

// ─── Get all negotiations for current user ───────────────────────────────────
exports.getMyNegotiations = async (req, res) => {
    try {
        const userId = req.user.id;

        const negotiations = await prisma.negotiatingChat.findMany({
            where: {
                OR: [{ buyerId: userId }, { farmerId: userId }]
            },
            include: {
                listing: { include: { crop: true } },
                buyer: { include: { buyerProfile: true } },
                farmer: { include: { farmerProfile: true } },
                messages: { orderBy: { createdAt: 'desc' }, take: 1 }
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.json(negotiations);
    } catch (error) {
        console.error('Error fetching negotiations:', error);
        res.status(500).json({ error: 'Failed to fetch negotiations' });
    }
};

// ─── Get single negotiation by ID ────────────────────────────────────────────
exports.getNegotiationById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const chat = await prisma.negotiatingChat.findUnique({
            where: { id },
            include: {
                listing: { include: { crop: true, farmer: { include: { farmerProfile: true } } } },
                buyer: { include: { buyerProfile: true } },
                farmer: { include: { farmerProfile: true } },
                messages: { orderBy: { createdAt: 'asc' } }
            }
        });

        if (!chat) return res.status(404).json({ error: 'Negotiation not found' });
        if (chat.buyerId !== userId && chat.farmerId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(chat);
    } catch (error) {
        console.error('Error fetching negotiation:', error);

        res.status(500).json({ error: 'Failed to fetch negotiation' });
    }
};

// ─── Get messages for a negotiation ──────────────────────────────────────────
exports.getMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const chat = await prisma.negotiatingChat.findUnique({ where: { id } });
        if (!chat) return res.status(404).json({ error: 'Negotiation not found' });
        if (chat.buyerId !== userId && chat.farmerId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const messages = await prisma.negotiationMessage.findMany({
            where: { chatId: id },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: {
                    select: { id: true, role: true, farmerProfile: { select: { fullName: true } }, buyerProfile: { select: { fullName: true } } }
                }
            }
        });

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

// ─── Send a text message ─────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const senderId = req.user.id;

        if (!text || !text.trim()) return res.status(400).json({ error: 'Message text is required' });

        const chat = await prisma.negotiatingChat.findUnique({ where: { id } });
        if (!chat) return res.status(404).json({ error: 'Negotiation not found' });
        if (chat.buyerId !== senderId && chat.farmerId !== senderId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const message = await prisma.negotiationMessage.create({
            data: {
                chatId: id,
                senderId,
                text: text.trim(),
                type: 'TEXT'
            },
            include: {
                sender: {
                    select: { id: true, role: true, farmerProfile: { select: { fullName: true } }, buyerProfile: { select: { fullName: true } } }
                }
            }
        });

        // Update last message
        await prisma.negotiatingChat.update({
            where: { id },
            data: { lastMessage: text.trim() }
        });

        // Broadcast via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`negotiation-${id}`).emit('negotiation:message', message);

            // Notify the other user
            const recipientId = senderId === chat.buyerId ? chat.farmerId : chat.buyerId;
            io.to(`user-${recipientId}`).emit('negotiation:notification', {
                chatId: id,
                message: text.trim(),
                senderId
            });

            // Create persistent notification
            await prisma.notification.create({
                data: {
                    userId: recipientId,
                    title: 'New Message',
                    message: text.trim(),
                    type: 'negotiation_offer',
                    chatId: id
                }
            });
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

// ─── Send a counter offer ────────────────────────────────────────────────────
exports.sendOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        const senderId = req.user.id;

        if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid offer amount is required' });

        const chat = await prisma.negotiatingChat.findUnique({ where: { id } });
        if (!chat) return res.status(404).json({ error: 'Negotiation not found' });
        if (chat.buyerId !== senderId && chat.farmerId !== senderId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (chat.status === 'ACCEPTED' || chat.status === 'REJECTED') {
            return res.status(400).json({ error: 'This negotiation is already closed' });
        }

        // Mark previous pending offers as superseded
        await prisma.negotiationMessage.updateMany({
            where: { chatId: id, type: 'OFFER', offerStatus: 'pending' },
            data: { offerStatus: 'superseded' }
        });

        const message = await prisma.negotiationMessage.create({
            data: {
                chatId: id,
                senderId,
                text: `Counter offer: ₹${amount}/kg`,
                type: 'OFFER',
                offerValue: amount,
                offerStatus: 'pending'
            },
            include: {
                sender: {
                    select: { id: true, role: true, farmerProfile: { select: { fullName: true } }, buyerProfile: { select: { fullName: true } } }
                }
            }
        });

        // Update chat with new offer
        await prisma.negotiatingChat.update({
            where: { id },
            data: {
                currentOffer: amount,
                status: 'COUNTER',
                lastMessage: `Counter offer: ₹${amount}/kg`
            }
        });

        // Broadcast via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`negotiation-${id}`).emit('negotiation:message', message);

            const recipientId = senderId === chat.buyerId ? chat.farmerId : chat.buyerId;
            io.to(`user-${recipientId}`).emit('negotiation:notification', {
                chatId: id,
                message: `New offer: ₹${amount}/kg`,
                senderId,
                type: 'OFFER'
            });

            // Create persistent notification
            await prisma.notification.create({
                data: {
                    userId: recipientId,
                    title: 'New Offer Received',
                    message: `Counter offer: ₹${amount}/kg`,
                    type: 'negotiation_offer',
                    chatId: id
                }
            });
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Error sending offer:', error);
        res.status(500).json({ error: 'Failed to send offer' });
    }
};

// ─── Accept the current offer ────────────────────────────────────────────────
exports.acceptOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const chat = await prisma.negotiatingChat.findUnique({
            where: { id },
            include: { listing: true }
        });

        if (!chat) return res.status(404).json({ error: 'Negotiation not found' });
        if (chat.buyerId !== userId && chat.farmerId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (chat.status === 'ACCEPTED' || chat.status === 'REJECTED') {
            return res.status(400).json({ error: 'This negotiation is already closed' });
        }

        // Mark the latest pending offer as accepted
        await prisma.negotiationMessage.updateMany({
            where: { chatId: id, type: 'OFFER', offerStatus: 'pending' },
            data: { offerStatus: 'accepted' }
        });

        // Update chat status
        const updatedChat = await prisma.negotiatingChat.update({
            where: { id },
            data: {
                status: 'ACCEPTED',
                lastMessage: 'Offer accepted! 🎉'
            }
        });

        // Add system message
        await prisma.negotiationMessage.create({
            data: {
                chatId: id,
                senderId: userId,
                text: `Offer of ₹${chat.currentOffer}/kg accepted! 🎉`,
                type: 'TEXT'
            }
        });

        // Broadcast via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`negotiation-${id}`).emit('negotiation:status', {
                chatId: id,
                status: 'ACCEPTED',
                offer: chat.currentOffer
            });

            const recipientId = userId === chat.buyerId ? chat.farmerId : chat.buyerId;
            io.to(`user-${recipientId}`).emit('negotiation:notification', {
                chatId: id,
                message: `Offer of ₹${chat.currentOffer}/kg accepted! 🎉`,
                type: 'ACCEPTED'
            });

            // Create persistent notification
            await prisma.notification.create({
                data: {
                    userId: recipientId,
                    title: 'Offer Accepted',
                    message: `Your offer of ₹${chat.currentOffer}/kg has been accepted!`,
                    type: 'negotiation_accepted',
                    chatId: id
                }
            });
        }

        res.json(updatedChat);
    } catch (error) {
        console.error('Error accepting offer:', error);
        res.status(500).json({ error: 'Failed to accept offer' });
    }
};

// ─── Reject the current offer ────────────────────────────────────────────────
exports.rejectOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const chat = await prisma.negotiatingChat.findUnique({ where: { id } });
        if (!chat) return res.status(404).json({ error: 'Negotiation not found' });
        if (chat.buyerId !== userId && chat.farmerId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (chat.status === 'ACCEPTED' || chat.status === 'REJECTED') {
            return res.status(400).json({ error: 'This negotiation is already closed' });
        }

        // Mark the latest pending offer as rejected
        await prisma.negotiationMessage.updateMany({
            where: { chatId: id, type: 'OFFER', offerStatus: 'pending' },
            data: { offerStatus: 'rejected' }
        });

        const updatedChat = await prisma.negotiatingChat.update({
            where: { id },
            data: {
                status: 'REJECTED',
                lastMessage: 'Offer rejected'
            }
        });

        // Add system message
        await prisma.negotiationMessage.create({
            data: {
                chatId: id,
                senderId: userId,
                text: 'Offer rejected.',
                type: 'TEXT'
            }
        });

        // Broadcast via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`negotiation-${id}`).emit('negotiation:status', {
                chatId: id,
                status: 'REJECTED'
            });

            const recipientId = userId === chat.buyerId ? chat.farmerId : chat.buyerId;
            io.to(`user-${recipientId}`).emit('negotiation:notification', {
                chatId: id,
                message: 'Offer was rejected',
                type: 'REJECTED'
            });

            // Create persistent notification
            await prisma.notification.create({
                data: {
                    userId: recipientId,
                    title: 'Offer Rejected',
                    message: 'Your offer was rejected.',
                    type: 'negotiation_rejected',
                    chatId: id
                }
            });
        }

        res.json(updatedChat);
    } catch (error) {
        console.error('Error rejecting offer:', error);
        res.status(500).json({ error: 'Failed to reject offer' });
    }
};
