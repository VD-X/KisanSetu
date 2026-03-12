import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import { negotiationAPI, notificationAPI } from '../services/api';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'new_listing' | 'out_for_delivery' | 'pickup_confirmed' | 'delivery_completed' |
    'negotiation_offer' | 'negotiation_accepted' | 'negotiation_rejected' | 'negotiation_new' |
    'new_delivery_available' | 'transporter_assigned' | 'earnings_updated';
    read: boolean;
    timestamp: Date;
    deliveryId?: string;
    chatId?: string;
}

const NotificationCenter: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;
    const navigate = useNavigate();
    const { user } = useAuth();

    // ─── Initial Load & Socket Listeners ─────────────────────────────
    useEffect(() => {
        if (!user?.id) return;

        // Fetch notifications from server
        const fetchNotifications = async () => {
            try {
                const data = await notificationAPI.getUserNotifications(user.id);
                const serverNotifs = data.map((n: any) => ({
                    id: n.id,
                    title: n.title,
                    message: n.message,
                    type: n.type,
                    read: n.isRead,
                    timestamp: new Date(n.createdAt),
                    chatId: n.chatId,
                    deliveryId: n.deliveryId
                }));
                setNotifications(serverNotifs);
            } catch (err) {
                console.error('Failed to fetch notifications:', err);
            }
        };

        fetchNotifications();

        // Connect and identify for personal room
        socketService.connect();
        socketService.identify(user.id);

        // 1. Listen for standard notifications
        const unsubscribe = socketService.onNotification((data: any) => {
            if (data.senderId && data.senderId === user.id) return;

            const newNotification: Notification = {
                id: data.id || `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                title: data.title || 'Notification',
                message: data.message,
                type: data.type || 'info',
                read: false,
                timestamp: new Date(),
                deliveryId: data.deliveryId
            };

            setNotifications(prev => [newNotification, ...prev].slice(0, 50));
        });

        // 2. Listen for negotiation status/offers
        const unsubNegotiation = socketService.onNegotiationNotification((data: any) => {
            if (data.senderId && data.senderId === user.id) return;

            let nType: Notification['type'] = 'negotiation_offer';
            let title = 'Chat Update';

            if (data.type === 'ACCEPTED') {
                nType = 'negotiation_accepted';
                title = 'Offer Accepted';
            } else if (data.type === 'REJECTED') {
                nType = 'negotiation_rejected';
                title = 'Offer Rejected';
            } else if (data.type === 'OFFER' || (!data.type && data.chatId)) {
                nType = 'negotiation_offer';
                title = data.type === 'OFFER' ? 'New Offer' : 'New Message';
            }

            const newNotification: Notification = {
                id: `neg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                title: title,
                message: data.message || `Message in chat ${data.chatId}`,
                type: nType,
                read: false,
                timestamp: new Date(),
                chatId: data.chatId
            };

            setNotifications(prev => [newNotification, ...prev].slice(0, 50));
        });

        // 3. Listen for new negotiations (Farmer only)
        const unsubNewNeg = socketService.onNegotiationNew((data: any) => {
            const newNotification: Notification = {
                id: `newneg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                title: 'New Negotiation',
                message: `Offer for ${data.quantity}kg at ₹${data.offer}/kg`,
                type: 'negotiation_new',
                read: false,
                timestamp: new Date(),
                chatId: data.chatId
            };

            setNotifications(prev => [newNotification, ...prev].slice(0, 50));
        });

        return () => {
            unsubscribe();
            unsubNegotiation();
            unsubNewNeg();
        };
    }, [user?.id]);



    // ─── Actions ─────────────────────────────────────────────────────
    const markAsRead = async (id: string) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            await notificationAPI.markAsRead(id);
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearAll = () => {
        if (!window.confirm('Clear all notifications?')) return;
        setNotifications([]);
        if (user?.id) localStorage.removeItem(`notifications_${user.id}`);
    };

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);
        if (notification.deliveryId) {
            navigate(`/tracking/${notification.deliveryId}`);
        } else if (notification.chatId) {
            localStorage.setItem('pending_tab', 'chats');
            navigate('/dashboard');
        }
        setIsOpen(false);
    };

    // ─── Styles ──────────────────────────────────────────────────────
    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'success': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
            case 'new_listing': return 'bg-blue-50 border-blue-200 text-blue-700';
            case 'out_for_delivery': return 'bg-orange-50 border-orange-200 text-orange-700';
            case 'pickup_confirmed': return 'bg-purple-50 border-purple-200 text-purple-700';
            case 'delivery_completed': return 'bg-green-50 border-green-200 text-green-700';
            case 'new_delivery_available': return 'bg-indigo-50 border-indigo-200 text-indigo-700';
            case 'transporter_assigned': return 'bg-cyan-50 border-cyan-200 text-cyan-700';
            case 'earnings_updated': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
            case 'negotiation_offer':
            case 'negotiation_new': return 'bg-amber-50 border-amber-200 text-amber-700';
            case 'negotiation_accepted': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
            case 'negotiation_rejected': return 'bg-rose-50 border-rose-200 text-rose-700';
            default: return 'bg-gray-50 border-gray-200 text-gray-700';
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'warning': return 'fa-exclamation-triangle';
            case 'error': return 'fa-times-circle';
            case 'negotiation_offer': return 'fa-hand-holding-usd';
            case 'negotiation_new': return 'fa-comments';
            case 'negotiation_accepted': return 'fa-check-double';
            case 'negotiation_rejected': return 'fa-times';
            case 'new_delivery_available': return 'fa-box-open';
            case 'transporter_assigned': return 'fa-shipping-fast';
            case 'earnings_updated': return 'fa-wallet';
            case 'out_for_delivery': return 'fa-truck-loading';
            case 'delivery_completed': return 'fa-check-double';
            default: return 'fa-info-circle';
        }
    };

    if (!user) return null;

    return (
        <div className="relative">
            {/* Notification Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-blue-600 text-white shadow-lg rotate-12' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'
                    } ${unreadCount > 0 ? 'animate-bounce-subtle' : ''}`}
            >
                <i className={`fas fa-bell ${unreadCount > 0 ? 'animate-swing' : ''}`}></i>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in duration-300">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                        <h3 className="font-extrabold text-gray-900 text-sm">Notifications</h3>
                        <div className="flex gap-3">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] text-blue-600 hover:text-blue-700 font-black uppercase tracking-widest"
                                >
                                    Mark Read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="text-[10px] text-red-600 hover:text-red-700 font-black uppercase tracking-widest"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-3">
                                    <i className="fas fa-bell-slash"></i>
                                </div>
                                <p className="text-sm text-gray-500">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/30' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getTypeStyles(notification.type)}`}>
                                            <i className={`fas ${getIcon(notification.type)} text-sm`}></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 mb-1">
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-gray-500 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
