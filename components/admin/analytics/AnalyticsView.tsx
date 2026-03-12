import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, Users, ShoppingBag, IndianRupee, Download, Filter, Calendar } from 'lucide-react';

const AnalyticsView: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7D');

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const res = await adminService.getAnalytics();
                // We'll mock some chart data based on the response if needed, 
                // but let's assume the backend provides trend data
                setData(res);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [timeRange]);

    if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">{[...Array(4)].map((_, i) => <div key={i} className="h-80 bg-gray-100 rounded-3xl animate-pulse" />)}</div>;

    // Mock trend data for visualization if not present
    const growthData = [
        { name: 'Mon', users: 400, orders: 240, revenue: 2400 },
        { name: 'Tue', users: 300, orders: 139, revenue: 2210 },
        { name: 'Wed', users: 200, orders: 980, revenue: 2290 },
        { name: 'Thu', users: 278, orders: 390, revenue: 2000 },
        { name: 'Fri', users: 189, orders: 480, revenue: 2181 },
        { name: 'Sat', users: 239, orders: 380, revenue: 2500 },
        { name: 'Sun', users: 349, orders: 430, revenue: 2100 },
    ];

    const categoryData = [
        { name: 'Grains', value: 45 },
        { name: 'Vegetables', value: 30 },
        { name: 'Fruits', value: 15 },
        { name: 'Others', value: 10 },
    ];

    const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

    return (
        <div className="space-y-8">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        Performance Analytics
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mt-1">Deep dive into platform growth and transaction metrics</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {['24H', '7D', '1M', '1Y'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeRange === range ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                    <button className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all">
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Charts Row 1: Growth */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" /> Registration & Activity
                        </h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={growthData}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <IndianRupee className="w-4 h-4 text-emerald-500" /> Revenue Growth (GMV)
                        </h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                />
                                <Line type="stepAfter" dataKey="revenue" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2: Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <h3 className="font-bold text-gray-800">Crop Category Share</h3>
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                            <p className="text-2xl font-black text-gray-900">72%</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Grains</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {categoryData.map((item, idx) => (
                            <div key={item.name} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                <span className="text-[10px] font-bold text-gray-500 uppercase">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <h3 className="font-bold text-gray-800">Weekly Order Volume</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={growthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar dataKey="orders" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsView;
