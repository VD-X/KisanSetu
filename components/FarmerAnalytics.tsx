import React, { useState, useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from 'recharts';

interface Deal {
    id: string;
    crop: string;
    buyer: string;
    qty: number;
    price: number;
    date: string;
    timestamp: string;
}

interface FarmerAnalyticsProps {
    deals: Deal[];
}

const FarmerAnalytics: React.FC<FarmerAnalyticsProps> = ({ deals }) => {
    const [timeRange, setTimeRange] = useState<7 | 15 | 30>(7);

    const filteredDeals = useMemo(() => {
        const now = new Date();
        const cutoff = new Date(now.getTime() - timeRange * 24 * 60 * 60 * 1000);
        return deals.filter(d => new Date(d.timestamp || Date.now()) >= cutoff);
    }, [deals, timeRange]);

    const stats = useMemo(() => {
        const cropMap: Record<string, { volume: number; revenue: number }> = {};
        let totalRevenue = 0;
        let totalVolume = 0;

        filteredDeals.forEach(d => {
            if (!cropMap[d.crop]) {
                cropMap[d.crop] = { volume: 0, revenue: 0 };
            }
            cropMap[d.crop].volume += d.qty;
            const revenue = d.qty * d.price;
            cropMap[d.crop].revenue += revenue;
            totalRevenue += revenue;
            totalVolume += d.qty;
        });

        const cropData = Object.entries(cropMap).map(([name, data]) => ({
            name,
            volume: data.volume,
            revenue: data.revenue
        })).sort((a, b) => b.volume - a.volume);

        return {
            cropData,
            totalRevenue,
            totalVolume,
            topCrop: cropData[0] || null
        };
    }, [filteredDeals]);

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="space-y-8 pb-32 animate-in fade-in duration-500">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Performance Analytics</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Detailed insights for your harvest sales</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-2xl self-start">
                    {[7, 15, 30].map(days => (
                        <button
                            key={days}
                            onClick={() => setTimeRange(days as any)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === days ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {days} Days
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400 mb-2">Total Earnings</p>
                        <h3 className="text-4xl font-black tracking-tighter">₹{stats.totalRevenue.toLocaleString()}</h3>
                        <div className="mt-4 flex items-center gap-2 text-green-400">
                            <i className="fas fa-arrow-trend-up"></i>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Across {filteredDeals.length} sales</span>
                        </div>
                    </div>
                    <i className="fas fa-sack-dollar absolute right-[-20px] top-[-20px] text-[120px] opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500"></i>
                </div>

                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden group">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Volume Sold</p>
                    <h3 className="text-4xl font-black tracking-tighter text-gray-900">{stats.totalVolume.toLocaleString()} <span className="text-xl font-bold text-gray-300">KG</span></h3>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Inventory Liquidity</span>
                    </div>
                </div>

                <div className="bg-green-50 p-8 rounded-[40px] shadow-sm border border-green-100 relative overflow-hidden group">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 mb-2">Top Performer</p>
                    <h3 className="text-3xl font-black tracking-tight text-gray-900 truncate">{stats.topCrop?.name || '---'}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-700 mt-2">
                        {stats.topCrop ? `${stats.topCrop.volume.toLocaleString()} KG sold` : 'Keep listing to see stats'}
                    </p>
                    <i className="fas fa-crown absolute right-[-10px] bottom-[-10px] text-[80px] text-green-600/10 rotate-12"></i>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Volume Breakdown Bar Chart */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs">Sales Volume Breakdown</h4>
                            <p className="text-[10px] font-bold text-gray-400 mt-1">Kilograms sold per crop category</p>
                        </div>
                        <i className="fas fa-chart-bar text-gray-200 text-xl"></i>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.cropData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                    cursor={{ fill: '#f9fafb' }}
                                />
                                <Bar dataKey="volume" radius={[12, 12, 0, 0]}>
                                    {stats.cropData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue Distribution */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs">Revenue Distribution</h4>
                            <p className="text-[10px] font-bold text-gray-400 mt-1">Earnings share by crop type</p>
                        </div>
                        <i className="fas fa-chart-pie text-gray-200 text-xl"></i>
                    </div>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.cropData}
                                    dataKey="revenue"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    stroke="none"
                                >
                                    {stats.cropData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Custom Legend */}
                        <div className="flex flex-col gap-2 min-w-[120px]">
                            {stats.cropData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">{entry.name}</span>
                                    <span className="text-[10px] font-bold text-gray-300">
                                        {Math.round((entry.revenue / (stats.totalRevenue || 1)) * 100)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Table for Earning Stats */}
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50">
                    <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs">Crop Wise Profitability</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Crop Name</th>
                                <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Volume (KG)</th>
                                <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Avg Rate</th>
                                <th className="p-6 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Total Earning</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.cropData.map((item, idx) => (
                                <tr key={item.name} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-lg">
                                                <span className="font-black text-[10px] text-gray-400">{item.name.charAt(0)}</span>
                                            </div>
                                            <span className="font-black text-sm text-gray-900">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center font-bold text-gray-600">{item.volume.toLocaleString()}</td>
                                    <td className="p-6 text-center font-bold text-gray-600">₹{Math.round(item.revenue / (item.volume || 1))}</td>
                                    <td className="p-6 text-right font-black text-emerald-600">₹{item.revenue.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FarmerAnalytics;
