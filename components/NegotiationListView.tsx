import React, { useState, useEffect } from 'react';
import { negotiationAPI } from '../services/api';
import ChatNegotiation from './ChatNegotiation';
import { socketService } from '../services/socketService';

// ─── Types ───────────────────────────────────────────────────────────────────
interface NegotiationListItem {
    id: string;
    listingId: string;
    buyerId: string;
    farmerId: string;
    requestedQuantity: number;
    currentOffer: number;
    status: string;
    lastMessage?: string;
    createdAt: string;
    updatedAt: string;
    listing?: {
        crop?: { name: string; icon: string };
    };
    buyer?: { buyerProfile?: { fullName: string } };
    farmer?: { farmerProfile?: { fullName: string } };
    messages?: { text: string; createdAt: string }[];
}

interface NegotiationListViewProps {
    userId: string;
    userRole: 'FARMER' | 'BUYER';
    onProceedToCheckout?: (data: { listingId: string, quantity: number, price: number, negotiationId: string }) => void;
}

const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const NegotiationListView: React.FC<NegotiationListViewProps> = ({ userId, userRole, onProceedToCheckout }) => {
    const [negotiations, setNegotiations] = useState<NegotiationListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'open' | 'accepted' | 'rejected'>('all');

    const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('lastRead_negotiations');
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(() => {
        if (selectedChatId) {
            const chat = negotiations.find(n => n.id === selectedChatId);
            const chatTime = chat ? new Date(chat.updatedAt).getTime() : Date.now();

            setLastReadTimestamps(prev => {
                const updated = { ...prev, [selectedChatId]: chatTime };
                localStorage.setItem('lastRead_negotiations', JSON.stringify(updated));
                return updated;
            });
        }
    }, [selectedChatId, negotiations]);

    const isFarmer = userRole === 'FARMER';
    const accentColor = isFarmer ? 'emerald' : 'blue';

    // ─── Fetch negotiations ────────────────────────────────────────────
    const fetchNegotiations = async () => {
        try {
            setLoading(true);
            const data = await negotiationAPI.getMy();
            setNegotiations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch negotiations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNegotiations();

        // Listen for updates to refresh the list
        const unsubNotify = socketService.onNegotiationNotification(() => fetchNegotiations());
        const unsubNew = socketService.onNegotiationNew(() => fetchNegotiations());
        const unsubMsg = socketService.onNegotiationMessage(() => fetchNegotiations());

        return () => {
            unsubNotify();
            unsubNew();
            unsubMsg();
        };
    }, []);

    // ─── Filter negotiations ──────────────────────────────────────────
    const filtered = negotiations.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'open') return n.status === 'OPEN' || n.status === 'COUNTER';
        return n.status === filter.toUpperCase();
    });

    // ─── Status change handler ────────────────────────────────────────
    const handleStatusChange = (chatId: string, status: string) => {
        setNegotiations(prev =>
            prev.map(n => n.id === chatId ? { ...n, status } : n)
        );
    };

    // ─── If chat is open, show it ─────────────────────────────────────
    if (selectedChatId) {
        return (
            <ChatNegotiation
                chatId={selectedChatId}
                userId={userId}
                userRole={userRole}
                onClose={() => { setSelectedChatId(null); fetchNegotiations(); }}
                onStatusChange={handleStatusChange}
                onProceedToCheckout={onProceedToCheckout}
            />
        );
    }

    // ─── Loading ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-3xl text-gray-300 mb-4"></i>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading chats...</p>
                </div>
            </div>
        );
    }

    // ─── Render ────────────────────────────────────────────────────────
    return (
        <div className="max-w-7xl mx-auto px-4 pt-2 overflow-hidden">
            {/* Header */}
            <div className="mb-2">
                <h2 className="text-4xl font-black text-gray-900 mb-1">Negotiations</h2>
                <p className="text-sm text-gray-500">
                    {isFarmer ? 'Price offers from buyers on your listings' : 'Your price negotiations with farmers'}
                </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 mb-2 pb-1">
                {(['all', 'open', 'accepted', 'rejected'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-2xl text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${filter === f
                            ? `bg-${accentColor}-600 text-white shadow-lg shadow-${accentColor}-200`
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        {f === 'all' ? `All (${negotiations.length})` :
                            f === 'open' ? `Active (${negotiations.filter(n => n.status === 'OPEN' || n.status === 'COUNTER').length})` :
                                f === 'accepted' ? `Accepted (${negotiations.filter(n => n.status === 'ACCEPTED').length})` :
                                    `Rejected (${negotiations.filter(n => n.status === 'REJECTED').length})`}
                    </button>
                ))}
            </div>

            {/* Negotiation List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-comments text-3xl text-gray-200"></i>
                    </div>
                    <p className="text-sm font-bold text-gray-400 mb-1">No negotiations yet</p>
                    <p className="text-xs text-gray-400">
                        {isFarmer ? "When buyers send price offers, they'll appear here." : "Start negotiating by tapping 'Negotiate' on any listing."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(neg => {
                        const partnerName = isFarmer
                            ? neg.buyer?.buyerProfile?.fullName || 'Buyer'
                            : neg.farmer?.farmerProfile?.fullName || 'Farmer';
                        const cropName = neg.listing?.crop?.name || 'Crop';
                        const cropIcon = neg.listing?.crop?.icon || '🌾';
                        const isActive = neg.status === 'OPEN' || neg.status === 'COUNTER';
                        const unread = (lastReadTimestamps[neg.id] || 0) < new Date(neg.updatedAt).getTime();

                        return (
                            <button
                                key={neg.id}
                                onClick={() => setSelectedChatId(neg.id)}
                                className="w-full bg-white rounded-[24px] p-4 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all text-left active:scale-[0.98] group"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${isActive ? `bg-${accentColor}-50` : neg.status === 'ACCEPTED' ? 'bg-green-50' : 'bg-gray-50'
                                        }`}>
                                        {cropIcon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2 truncate">
                                                <h4 className="font-black text-sm text-gray-900 truncate">{partnerName}</h4>
                                                {unread && (
                                                    <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                                                )}
                                            </div>
                                            <span className="text-[9px] text-gray-400 font-bold whitespace-nowrap ml-2">
                                                {formatRelativeTime(neg.updatedAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-gray-500 truncate">{cropName} • {neg.requestedQuantity} kg</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-gray-400 truncate flex-1">{neg.lastMessage || neg.messages?.[0]?.text || 'No messages'}</p>
                                            <span className={`ml-2 shrink-0 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${neg.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                                                neg.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                                                    `bg-${accentColor}-100 text-${accentColor}-700`
                                                }`}>
                                                {neg.status === 'COUNTER' ? 'ACTIVE' : neg.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <i className="fas fa-chevron-right text-gray-300 group-hover:text-gray-400 transition-colors shrink-0"></i>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NegotiationListView;
