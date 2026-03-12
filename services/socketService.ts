import { io, Socket } from 'socket.io-client';

class SocketService {
    private socket: Socket | null = null;
    private readonly serverUrl: string;

    constructor() {
        const raw = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        this.serverUrl = raw.endsWith('/api') ? raw.slice(0, -4) : raw.replace(/\/+$/, '');
    }

    connect(): void {
        if (this.socket?.connected) {
            return;
        }

        this.socket = io(this.serverUrl, {
            transports: ['websocket'],
            withCredentials: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        const socket = this.socket;
        this.socket.on('connect', () => {
            // Optional: set VITE_DEBUG_SOCKET=1 to log connection
            if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SOCKET === '1') {
                console.log('WebSocket connected:', socket.id ?? '');
            }
        });

        // In DEV, log only non–high-frequency events (skip locationUpdate / etaUpdate)
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SOCKET === '1') {
            const quietEvents = new Set(['locationUpdate', 'etaUpdate']);
            this.socket.onAny((event, ...args) => {
                if (!quietEvents.has(event)) {
                    console.log(`[Socket event: ${event}]`, args);
                }
            });
        }

        this.socket.on('disconnect', () => {
            if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_SOCKET === '1') {
                console.log('WebSocket disconnected');
            }
        });

        this.socket.on('connect_error', () => {
            if (import.meta.env.DEV) {
                console.warn('WebSocket unavailable (is the backend running?)');
            }
        });
    }

    disconnect(): void {
        if (this.socket) {
            // Remove listeners to prevent side effects
            this.socket.removeAllListeners();

            // Only close if OPEN or CONNECTING
            if (this.socket.connected) {
                this.socket.disconnect();
            }
            this.socket = null;
        }
    }

    joinOrderRoom(orderId: string): void {
        if (this.socket) {
            this.socket.emit('join-order-room', orderId);
        }
    }

    joinDeliveryRoom(deliveryId: string): void {
        if (this.socket) {
            this.socket.emit('joinDelivery', deliveryId);
        }
    }

    joinUserRoom(userId: string): void {
        if (this.socket && userId) {
            this.socket.emit('join-user-room', userId);
        }
    }

    joinVehicleRoom(vehicleType: string): void {
        if (this.socket && vehicleType) {
            this.socket.emit('join-vehicle-room', vehicleType);
        }
    }

    leaveVehicleRoom(vehicleType: string): void {
        if (this.socket && vehicleType) {
            this.socket.emit('leave-vehicle-room', vehicleType);
        }
    }

    identify(userId: string): void {
        if (this.socket && userId) {
            this.socket.emit('identify', userId);
        }
    }

    leaveUserRoom(userId: string): void {
        if (this.socket && userId) {
            this.socket.emit('leave-user-room', userId);
        }
    }

    leaveOrderRoom(orderId: string): void {
        if (this.socket) {
            this.socket.emit('leave-order-room', orderId);
        }
    }

    leaveDeliveryRoom(deliveryId: string): void {
        if (this.socket) {
            this.socket.emit('leaveDelivery', deliveryId);
        }
    }

    onDeliveryCreated(callback: (data: any) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('delivery:created', callback);
            return () => {
                socket.off('delivery:created', callback);
            };
        }
        return () => { };
    }

    onDeliveryAccepted(callback: (data: any) => void): () => void {
        if (!this.socket) return () => { };
        this.socket.on('delivery:accepted', callback);
        return () => this.socket?.off('delivery:accepted', callback);
    }

    onDeliveryTaken(callback: (data: { dealId: string }) => void): () => void {
        if (!this.socket) return () => { };
        this.socket.on('delivery:taken', callback);
        return () => this.socket?.off('delivery:taken', callback);
    }

    onDeliveryOtpVerified(callback: (data: any) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('delivery:otp-verified', callback);
            return () => {
                socket.off('delivery:otp-verified', callback);
            };
        }
        return () => { };
    }

    onDeliveryStatusUpdate(callback: (data: any) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('delivery:status-update', callback);
            return () => {
                socket.off('delivery:status-update', callback);
            };
        }
        return () => { };
    }

    emitTransporterLocation(deliveryId: string, lat: number, lng: number): void {
        if (this.socket) {
            this.socket.emit('sendLocation', { deliveryId, lat, lng });
        }
    }

    emitDeliveryStatusUpdate(deliveryId: string, status: string): void {
        if (this.socket) {
            this.socket.emit('delivery:status-update', { deliveryId, status });
        }
    }

    onLocationSharingStatus(callback: (data: {
        enabled: boolean;
        started?: Date;
        ended?: Date
    }) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('locationSharing:status', callback);
            return () => socket.off('locationSharing:status', callback);
        }
        return () => { };
    }

    emitLocationSharingToggle(deliveryId: string, enabled: boolean): void {
        if (this.socket) {
            this.socket.emit('locationSharing:toggle', { deliveryId, enabled });
        }
    }

    onLocationUpdate(callback: (data: { lat: number, lng: number }) => void): () => void {
        // Ensure socket is connected before setting up listener
        if (!this.socket) {
            this.connect();
        }
        const socket = this.socket;
        if (socket) {
            socket.on('locationUpdate', callback);
            return () => {
                if (socket) {
                    socket.off('locationUpdate', callback);
                }
            };
        }
        return () => { };
    }

    onEtaUpdate(callback: (data: { distance: string, duration: number }) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('etaUpdate', callback);
            return () => {
                socket.off('etaUpdate', callback);
            };
        }
        return () => { };
    }

    onDeliveryCompleted(callback: (data: any) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('delivery:completed', callback);
            return () => {
                socket.off('delivery:completed', callback);
            };
        }
        return () => { };
    }

    onEarningsUpdated(callback: (data: any) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('earnings:updated', callback);
            return () => {
                socket.off('earnings:updated', callback);
            };
        }
        return () => { };
    }

    offEarningsUpdated(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.off('earnings:updated', callback);
        }
    }

    onPushNotification(callback: (data: any) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('push:notification', callback);
            return () => {
                socket.off('push:notification', callback);
            };
        }
        return () => { };
    }

    offPushNotification(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.off('push:notification', callback);
        }
    }

    // Listing events
    joinListingsRoom(): void {
        if (this.socket) {
            this.socket.emit('join-listings-room');
        }
    }

    leaveListingsRoom(): void {
        if (this.socket) {
            this.socket.emit('leave-listings-room');
        }
    }

    joinNegotiationRoom(chatId: string): void {
        if (this.socket) {
            this.socket.emit('join-negotiation', chatId);
        }
    }

    leaveNegotiationRoom(chatId: string): void {
        if (this.socket) {
            this.socket.emit('leave-negotiation', chatId);
        }
    }

    onNegotiationMessage(callback: (data: any) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('negotiation:message', callback);
            return () => {
                socket.off('negotiation:message', callback);
            };
        }
        return () => { };
    }

    offNegotiationMessage(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.off('negotiation:message', callback);
        }
    }

    onNegotiationStatus(callback: (data: any) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('negotiation:status', callback);
            return () => {
                socket.off('negotiation:status', callback);
            };
        }
        return () => { };
    }

    offNegotiationStatus(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.off('negotiation:status', callback);
        }
    }

    sendNegotiationMessage(chatId: string, senderId: string, text: string): void {
        if (this.socket) {
            this.socket.emit('negotiation:send-message', { chatId, senderId, text });
        }
    }

    sendNegotiationOffer(chatId: string, senderId: string, amount: number): void {
        if (this.socket) {
            this.socket.emit('negotiation:send-offer', { chatId, senderId, amount });
        }
    }



    // Order events
    onOrderCreated(callback: (data: any) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('order:created', callback);
            return () => {
                socket.off('order:created', callback);
            };
        }
        return () => { };
    }

    onOrderCancelled(callback: (data: any) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('order:cancelled', callback);
            return () => {
                socket.off('order:cancelled', callback);
            };
        }
        return () => { };
    }

    emitNotification(notification: { userId: string; title: string; message: string; type: string; deliveryId?: string }): void {
        if (this.socket) {
            this.socket.emit('notification', notification);
        }
    }

    onNotification(callback: (data: any) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('notification', callback);
            return () => {
                socket.off('notification', callback);
            };
        }
        return () => { };
    }

    offNotification(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.off('notification', callback);
        }
    }

    onNegotiationNotification(callback: (data: any) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('negotiation:notification', callback);
            return () => {
                socket.off('negotiation:notification', callback);
            };
        }
        return () => { };
    }

    onNegotiationNew(callback: (data: any) => void): () => void {
        const socket = this.socket;
        if (socket) {
            socket.on('negotiation:new', callback);
            return () => {
                socket.off('negotiation:new', callback);
            };
        }
        return () => { };
    }

    removeAllListeners(): void {
        if (this.socket) {
            this.socket.removeAllListeners();
        }
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export const socketService = new SocketService();
