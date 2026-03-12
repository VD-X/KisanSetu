const { Server } = require("socket.io");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // Or use require("./config/db") if it works
const getRoute = require("./services/osrmService");
const vehicleService = require("./services/vehicleService");

const isValidObjectId = (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

let io;
const userMap = new Map(); // userId -> socketId
const lastUpdateMap = new Map(); // deliveryId -> timestamp

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Add debug logging for all events
        socket.onAny((eventName, ...args) => {
            console.log(`[DEBUG] Received event: ${eventName}`, args);
        });

        // --- User Identification ---
        socket.on("identify", (userId) => {
            userMap.set(userId, socket.id);
            console.log(`Mapped User ${userId} to Socket ${socket.id}`);
            socket.join(`user-${userId}`); // Join a personal room
        });


        socket.on("join-user-room", (userId) => {
            socket.join(`user-${userId}`);
            console.log(`User ${userId} joined room user-${userId}`);
        });

        socket.on("join-order-room", (orderId) => {
            socket.join(`order-${orderId}`);
            console.log(`Socket ${socket.id} joined order room: order-${orderId}`);
        });

        socket.on("leave-order-room", (orderId) => {
            socket.leave(`order-${orderId}`);
            console.log(`Socket ${socket.id} left order room: order-${orderId}`);
        });

        // --- Vehicle Matching ---
        socket.on("join-vehicle-room", (vehicleType) => {
            if (!vehicleType) return;
            const roomName = vehicleService.getVehicleRoomName(vehicleType);
            if (roomName) {
                socket.join(roomName);
                console.log(`Socket ${socket.id} joined vehicle room: ${roomName}`);
            }
        });

        socket.on("leave-vehicle-room", (vehicleType) => {
            if (!vehicleType) return;
            const roomName = vehicleService.getVehicleRoomName(vehicleType);
            if (roomName) {
                socket.leave(roomName);
                console.log(`Socket ${socket.id} left vehicle room: ${roomName}`);
            }
        });



        // --- Delivery Tracking ---
        socket.on("joinDelivery", (deliveryId) => {
            socket.join(deliveryId);
            console.log(`Socket ${socket.id} joined delivery: ${deliveryId}`);
        });

        socket.on("leaveDelivery", (deliveryId) => {
            socket.leave(deliveryId);
        });

        socket.on("sendLocation", async (data) => {
            try {
                const { deliveryId, lat, lng } = data;

                // Rate limiting: Update DB max once every 30 seconds per delivery
                const now = Date.now();
                const lastUpdate = lastUpdateMap.get(deliveryId) || 0;

                if (now - lastUpdate > 30000) {
                    lastUpdateMap.set(deliveryId, now);

                    if (isValidObjectId(deliveryId)) {
                        // Get delivery details to find order ID
                        const delivery = await prisma.delivery.findUnique({
                            where: { id: deliveryId },
                            select: { orderId: true }
                        });

                        if (delivery) {
                            await prisma.delivery.update({
                                where: { id: deliveryId },
                                data: {
                                    transporterLocation: { lat, lng },
                                    lastLocationUpdate: new Date()
                                }
                            }).catch(e => console.error("Failed to update location in DB:", e.message));

                            // Broadcast to order room (for buyer/farmer tracking)
                            socket.to(`order-${delivery.orderId}`).emit("locationUpdate", {
                                lat,
                                lng,
                                timestamp: new Date(),
                                deliveryId
                            });

                            console.log(`[Socket] Broadcasted location for delivery ${deliveryId} to order room ${delivery.orderId}`);
                        }
                    }
                } else {
                    // Even if rate limited, still broadcast latest location
                    const delivery = await prisma.delivery.findUnique({
                        where: { id: deliveryId },
                        select: { orderId: true }
                    });

                    if (delivery) {
                        socket.to(`order-${delivery.orderId}`).emit("locationUpdate", {
                            lat,
                            lng,
                            timestamp: new Date(),
                            deliveryId
                        });
                    }
                }

            } catch (error) {
                console.error("Socket error:", error);
            }
        });

        // --- Negotiation Chat ---

        // Rate limiter: userId -> last message timestamp
        const messageRateMap = new Map();
        const RATE_LIMIT_MS = 1000; // 1 message per second

        // Helper: get userId from socket (set during "identify")
        const getSocketUserId = () => {
            for (const [uid, sid] of userMap.entries()) {
                if (sid === socket.id) return uid;
            }
            return null;
        };

        socket.on("join-negotiation", async (chatId) => {
            try {
                const userId = getSocketUserId();
                if (!userId || !isValidObjectId(chatId)) {
                    socket.emit("error", { message: "Unauthorized: identify first" });
                    return;
                }

                // Verify user belongs to this chat
                const chat = await prisma.negotiatingChat.findUnique({
                    where: { id: chatId },
                    select: { buyerId: true, farmerId: true }
                });

                if (!chat || (chat.buyerId !== userId && chat.farmerId !== userId)) {
                    socket.emit("error", { message: "Access denied: you are not a participant" });
                    return;
                }

                socket.join(`negotiation-${chatId}`);
                console.log(`Socket ${socket.id} (user ${userId}) joined negotiation: ${chatId}`);
            } catch (error) {
                console.error("Join negotiation error:", error);
            }
        });

        socket.on("leave-negotiation", (chatId) => {
            socket.leave(`negotiation-${chatId}`);
            console.log(`Socket ${socket.id} left negotiation: ${chatId}`);
        });

        socket.on("negotiation:send-message", async (data) => {
            try {
                const { chatId, senderId, text } = data;
                if (!chatId || !senderId || !text) return;

                // Verify sender identity matches socket
                const socketUserId = getSocketUserId();
                if (!socketUserId || socketUserId !== senderId) return;

                // Rate limiting
                const now = Date.now();
                const lastMsg = messageRateMap.get(senderId) || 0;
                if (now - lastMsg < RATE_LIMIT_MS) {
                    socket.emit("error", { message: "Please wait before sending another message" });
                    return;
                }
                messageRateMap.set(senderId, now);

                // Verify membership
                const chat = await prisma.negotiatingChat.findUnique({
                    where: { id: chatId },
                    select: { buyerId: true, farmerId: true, status: true }
                });
                if (!chat || (chat.buyerId !== senderId && chat.farmerId !== senderId)) return;

                // Sanitize input
                const sanitizedText = text.trim().slice(0, 2000); // Max 2000 chars
                if (!sanitizedText) return;

                const message = await prisma.negotiationMessage.create({
                    data: {
                        chatId,
                        senderId,
                        text: sanitizedText,
                        type: "TEXT"
                    },
                    include: {
                        sender: {
                            select: { id: true, role: true, farmerProfile: { select: { fullName: true } }, buyerProfile: { select: { fullName: true } } }
                        }
                    }
                });

                await prisma.negotiatingChat.update({
                    where: { id: chatId },
                    data: { lastMessage: sanitizedText }
                });

                io.to(`negotiation-${chatId}`).emit("negotiation:message", message);
            } catch (error) {
                console.error("Socket negotiation message error:", error);
            }
        });

        socket.on("negotiation:send-offer", async (data) => {
            try {
                const { chatId, senderId, amount } = data;
                if (!chatId || !senderId || !amount || amount <= 0) return;

                // Verify sender identity matches socket
                const socketUserId = getSocketUserId();
                if (!socketUserId || socketUserId !== senderId) return;

                // Verify membership + chat is still open
                const chat = await prisma.negotiatingChat.findUnique({
                    where: { id: chatId },
                    select: { buyerId: true, farmerId: true, status: true }
                });
                if (!chat || (chat.buyerId !== senderId && chat.farmerId !== senderId)) return;
                if (chat.status === 'ACCEPTED' || chat.status === 'REJECTED') return;

                // Mark previous pending offers as superseded
                await prisma.negotiationMessage.updateMany({
                    where: { chatId, type: 'OFFER', offerStatus: 'pending' },
                    data: { offerStatus: 'superseded' }
                });

                const message = await prisma.negotiationMessage.create({
                    data: {
                        chatId,
                        senderId,
                        text: `Counter offer: ₹${amount}/kg`,
                        type: "OFFER",
                        offerValue: amount,
                        offerStatus: "pending"
                    },
                    include: {
                        sender: {
                            select: { id: true, role: true, farmerProfile: { select: { fullName: true } }, buyerProfile: { select: { fullName: true } } }
                        }
                    }
                });

                await prisma.negotiatingChat.update({
                    where: { id: chatId },
                    data: { currentOffer: amount, status: "COUNTER", lastMessage: `Counter offer: ₹${amount}/kg` }
                });

                io.to(`negotiation-${chatId}`).emit("negotiation:message", message);
            } catch (error) {
                console.error("Socket negotiation offer error:", error);
            }
        });


        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
            // Remove from maps if needed
            for (const [uid, sid] of userMap.entries()) {
                if (sid === socket.id) userMap.delete(uid);
            }
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initSocket, getIo };
