const setupSocketServer = (io) => {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Join order-specific room
        socket.on('join-order-room', (orderId) => {
            socket.join(`order-${orderId}`);
            console.log(`Socket ${socket.id} joined room: order-${orderId}`);
        });

        socket.on('join-user-room', (userId) => {
            if (!userId) return;
            socket.join(`user-${userId}`);
            console.log(`Socket ${socket.id} joined room: user-${userId}`);
        });

        socket.on('leave-user-room', (userId) => {
            if (!userId) return;
            socket.leave(`user-${userId}`);
            console.log(`Socket ${socket.id} left room: user-${userId}`);
        });

        // Leave order room
        socket.on('leave-order-room', (orderId) => {
            socket.leave(`order-${orderId}`);
            console.log(`Socket ${socket.id} left room: order-${orderId}`);
        });

        // Join listings room (for buyers to get real-time listing updates)
        socket.on('join-listings-room', () => {
            socket.join('listings');
            console.log(`Socket ${socket.id} joined listings room`);
        });

        // Leave listings room
        socket.on('leave-listings-room', () => {
            socket.leave('listings');
            console.log(`Socket ${socket.id} left listings room`);
        });

        socket.on('join-negotiation-room', (chatId) => {
            socket.join(`negotiation-${chatId}`);
            console.log(`Socket ${socket.id} joined room: negotiation-${chatId}`);
        });

        socket.on('leave-negotiation-room', (chatId) => {
            socket.leave(`negotiation-${chatId}`);
            console.log(`Socket ${socket.id} left room: negotiation-${chatId}`);
        });

        socket.on('join-delivery-deals-room', () => {
            socket.join('delivery-deals');
            console.log(`Socket ${socket.id} joined delivery-deals room`);
        });

        socket.on('leave-delivery-deals-room', () => {
            socket.leave('delivery-deals');
            console.log(`Socket ${socket.id} left delivery-deals room`);
        });

        // --- Live GPS Tracking ---
        socket.on('join-tracking-room', (deliveryId) => {
            socket.join(`tracking-${deliveryId}`);
            console.log(`Socket ${socket.id} joined tracking room: ${deliveryId}`);
        });

        socket.on('update-location', ({ deliveryId, lat, lng }) => {
            // Broadcast to everyone in the room (Farmer & Buyer)
            io.to(`tracking-${deliveryId}`).emit('location-updated', { lat, lng });
        });

        socket.on('leave-tracking-room', (deliveryId) => {
            socket.leave(`tracking-${deliveryId}`);
        });

        // --- Delivery Chat ---
        socket.on('join-delivery-chat', (deliveryId) => {
            socket.join(`delivery-chat-${deliveryId}`);
        });

        socket.on('send-delivery-message', ({ deliveryId, senderId, text, role }) => {
            io.to(`delivery-chat-${deliveryId}`).emit('new-delivery-message', {
                senderId,
                text,
                role,
                timestamp: new Date()
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
};

module.exports = setupSocketServer;
