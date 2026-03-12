import React, { useEffect, useState } from 'react';
import { adminService } from '../../../services/adminService';
import { socketService } from '../../../services/socketService';
import { UserPlus, ShoppingBag, Truck, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';

interface ActivityItem {
    id: string;
    type: 'USER_REGISTER' | 'ORDER_PLACE' | 'DELIVERY_START' | 'DISPUTE' | 'ORDER_COMPLETE';
    title: string;
    description: string;
    timestamp: string;
    user?: string;
    amount?: number;
}

const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
        case 'USER_REGISTER': return { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-50' };
        case 'ORDER_PLACE': return { icon: ShoppingBag, color: 'text-emerald-500', bg: 'bg-emerald-50' };
        case 'DELIVERY_START': return { icon: Truck, color: 'text-purple-500', bg: 'bg-purple-50' };
        case 'DISPUTE': return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' };
        case 'ORDER_COMPLETE': return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' };
        default: return { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-50' };
    }
};

const ActivityFeed: React.FC = () => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mocking some initial activities for now since the backend might not have this specific endpoint yet
        // In a real scenario, we'd fetch from adminService.getActivityLogs()
        const mockActivities: ActivityItem[] = [
            { id: '1', type: 'USER_REGISTER', title: 'New Farmer Registered', description: 'Rajesh Kumar from Nagpur joined as a Farmer.', timestamp: new Date().toISOString(), user: 'Rajesh Kumar' },
            { id: '2', type: 'ORDER_PLACE', title: 'Order Placed', description: 'Large wholesale order for 500kg Wheat.', timestamp: new Date(Date.now() - 3600000).toISOString(), amount: 15400 },
            { id: '3', type: 'DELIVERY_START', title: 'Delivery In Transit', description: 'Transporter Amit S. started delivery for Order #8271.', timestamp: new Date(Date.now() - 7200000).toISOString() },
            { id: '4', type: 'DISPUTE', title: 'Payment Dispute', description: 'Buyer flagged quality issue for Order #8260.', timestamp: new Date(Date.now() - 10800000).toISOString() },
            { id: '5', type: 'ORDER_COMPLETE', title: 'Order Completed', description: 'Payment of ₹12,000 released to Farmer Sunita.', timestamp: new Date(Date.now() - 14400000).toISOString() },
        ];

        setActivities(mockActivities);
        setLoading(false);

        // Real-time Activity Listeners
        const unsubEarnings = socketService.onEarningsUpdated((data) => {
            const newActivity: ActivityItem = {
                id: Math.random().toString(36).substr(2, 9),
                type: 'ORDER_PLACE',
                title: 'Global Platform Commission',
                description: `A platform fee of ₹${data.fee || 0} was credited from a new transaction.`,
                timestamp: new Date().toISOString(),
                amount: data.fee
            };
            setActivities(prev => [newActivity, ...prev].slice(0, 15));
        });

        const unsubOrder = socketService.onOrderCreated((data) => {
            const newActivity: ActivityItem = {
                id: data.id || Math.random().toString(36).substr(2, 9),
                type: 'ORDER_PLACE',
                title: 'New Order Placed',
                description: `Order #${(data.id || '').slice(-6).toUpperCase()} was just placed on the platform.`,
                timestamp: new Date().toISOString(),
                amount: data.totalAmount
            };
            setActivities(prev => [newActivity, ...prev].slice(0, 15));
        });

        const unsubDelivery = socketService.onDeliveryCreated((data) => {
            const newActivity: ActivityItem = {
                id: Math.random().toString(36).substr(2, 9),
                type: 'DELIVERY_START',
                title: 'Delivery Initiated',
                description: `A new delivery task has been created for ${data.transporter?.name || 'a transporter'}.`,
                timestamp: new Date().toISOString()
            };
            setActivities(prev => [newActivity, ...prev].slice(0, 15));
        });

        return () => {
            if (unsubEarnings) unsubEarnings();
            if (unsubOrder) unsubOrder();
            if (unsubDelivery) unsubDelivery();
        };
    }, []);

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />)}</div>;

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Recent Activity</h2>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">Real-time updates from across the platform</p>
                </div>
                <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-all">
                    View All
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-1">
                {activities.map((activity) => {
                    const { icon: Icon, color, bg } = getActivityIcon(activity.type);
                    return (
                        <div key={activity.id} className="group flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors rounded-2xl cursor-pointer">
                            <div className={`p-2.5 rounded-xl ${bg} ${color} transition-transform group-hover:scale-110`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-bold text-gray-800 truncate">{activity.title}</h3>
                                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap ml-2">{formatTime(activity.timestamp)}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{activity.description}</p>
                                {activity.amount && (
                                    <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded-full">
                                        ₹{activity.amount.toLocaleString()}
                                    </div>
                                )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    );
                })}
            </div>

            <div className="p-4 bg-gray-50 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Updates Enabled</p>
            </div>
        </div>
    );
};

export default ActivityFeed;
