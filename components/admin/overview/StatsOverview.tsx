import React, { useEffect, useState } from 'react';
import { adminService } from '../../../services/adminService';
import { Users, UserCheck, Truck, Clock, Wheat, CheckCircle2, TrendingUp, IndianRupee, ShoppingCart } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: any;
    trend?: string;
    description: string;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, description, color }) => (
    <div className="group relative bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-emerald-500/20 transition-all duration-500 hover:-translate-y-1">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-[0.03] rounded-bl-full group-hover:opacity-[0.06] transition-opacity`} />

        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl bg-gradient-to-br ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-500`}>
                <Icon className={`w-6 h-6 ${color.split(' ')[0].replace('from-', 'text-')}`} />
            </div>
            {trend && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    <TrendingUp className="w-3 h-3" />
                    {trend}
                </span>
            )}
        </div>

        <div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
            <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
            <p className="text-xs text-gray-400 mt-2 font-medium">{description}</p>
        </div>
    </div>
);

const StatsOverview: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await adminService.getStats();
                setStats(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-40 bg-gray-100 rounded-3xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (!stats) return <div className="text-center py-12 text-gray-500">Failed to load statistics.</div>;

    const cards = [
        {
            title: "Total Farmers",
            value: (stats.users?.farmers || 0).toLocaleString(),
            icon: Users,
            description: "Registered crop producers",
            color: "from-emerald-500 to-teal-600",
            trend: "+12%"
        },
        {
            title: "Total Buyers",
            value: (stats.users?.buyers || 0).toLocaleString(),
            icon: UserCheck,
            description: "Active procurement partners",
            color: "from-blue-500 to-indigo-600",
            trend: "+8%"
        },
        {
            title: "Transporters",
            value: (stats.users?.transporters || 0).toLocaleString(),
            icon: Truck,
            description: "Logistics providers",
            color: "from-purple-500 to-pink-600",
        },
        {
            title: "Pending Approval",
            value: stats.users?.pendingTransporters || 0,
            icon: Clock,
            description: "KYC reviews required",
            color: "from-orange-500 to-red-600",
        },
        {
            title: "Active Listings",
            value: (stats.marketplace?.activeListings || 0).toLocaleString(),
            icon: Wheat,
            description: "Ongoing crop availability",
            color: "from-green-500 to-emerald-600",
            trend: "+24%"
        },
        {
            title: "Deliveries in Progress",
            value: stats.marketplace?.deliveriesProgress || 0,
            icon: Clock,
            description: "Active transit requests",
            color: "from-blue-400 to-cyan-500",
        },
        {
            title: "Orders Completed",
            value: (stats.marketplace?.deliveriesCompleted || 0).toLocaleString(),
            icon: CheckCircle2,
            description: "Successfully fulfilled",
            color: "from-emerald-400 to-emerald-600",
        },
        {
            title: "Total Revenue",
            value: `₹${(stats.marketplace?.totalEarnings || 0).toLocaleString()}`,
            icon: IndianRupee,
            description: "Gross platform volume",
            color: "from-amber-400 to-orange-500",
            trend: "+18%"
        }
    ];

    return (
        <div className="space-y-8">
            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <StatCard key={idx} {...card} />
                ))}
            </div>

            {/* Today's Highlight Bar */}
            <div className="bg-emerald-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-emerald-600/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-xl font-bold mb-2">Platform Activity Today</h2>
                        <p className="text-emerald-50/80 text-sm">Real-time update of what's happening on KisanSetu right now.</p>
                    </div>
                    <div className="flex gap-8">
                        <div className="text-center">
                            <p className="text-3xl font-bold">{stats.marketplace?.ordersToday || 0}</p>
                            <p className="text-xs text-emerald-100/60 uppercase tracking-wider font-bold mt-1">New Orders</p>
                        </div>
                        <div className="w-px h-12 bg-white/20" />
                        <div className="text-center">
                            <p className="text-3xl font-bold">{stats.marketplace?.ordersMonth || 0}</p>
                            <p className="text-xs text-emerald-100/60 uppercase tracking-wider font-bold mt-1">This Month</p>
                        </div>
                        <div className="w-px h-12 bg-white/20" />
                        <div className="text-center">
                            <p className="text-3xl font-bold">{stats.marketplace?.totalOrders || 0}</p>
                            <p className="text-xs text-emerald-100/60 uppercase tracking-wider font-bold mt-1">Total Lifetime</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsOverview;
