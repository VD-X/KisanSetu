import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { socketService } from '../../../services/socketService';
import { IndianRupee, TrendingUp, Filter, Download, Calendar, ArrowUpRight, ArrowDownRight, Briefcase, Bell } from 'lucide-react';

const EarningsManager: React.FC = () => {
    const [earnings, setEarnings] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRealtimeAlert, setShowRealtimeAlert] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const res = await adminService.getEarnings({});
                setEarnings(res);
                // Mocking initial transactions for display
                setTransactions([
                    { id: 't1', type: 'COMMISSION', details: 'Order #1024 Commission', entity: 'Premium Sharbati Wheat Sale', amount: 24500, fee: 3062.5, status: 'CREDITED', date: new Date().toISOString() },
                    { id: 't2', type: 'PAYOUT', details: 'Farmer Weekly Payout', entity: 'Farmer Rajesh Kumar', amount: 45000, fee: 0, status: 'PROCESSED', date: new Date(Date.now() - 86400000).toISOString() },
                    { id: 't3', type: 'COMMISSION', details: 'Order #1025 Commission', entity: 'Organic Basmati Rice', amount: 12000, fee: 1500, status: 'CREDITED', date: new Date(Date.now() - 172800000).toISOString() },
                ]);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();

        // Socket listeners
        const unsubscribe = socketService.onEarningsUpdated((data) => {
            setEarnings((prev: any) => ({
                ...prev,
                totalCommission: (prev?.totalCommission || 0) + (data.fee || 0),
                pendingPayouts: data.pendingPayouts ?? prev?.pendingPayouts,
            }));

            if (data.transaction) {
                setTransactions(prev => [data.transaction, ...prev.slice(0, 9)]);
            } else {
                // Fallback mock transaction if not provided
                const newTx = {
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'COMMISSION',
                    details: `Real-time Order Commission`,
                    entity: 'Market Transaction',
                    amount: data.amount || 0,
                    fee: data.fee || 0,
                    status: 'CREDITED',
                    date: new Date().toISOString()
                };
                setTransactions(prev => [newTx, ...prev.slice(0, 9)]);
            }

            setShowRealtimeAlert(true);
            setTimeout(() => setShowRealtimeAlert(false), 5000);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    if (loading) return (
        <div className="space-y-8 animate-pulse p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-3xl" />)}
            </div>
            <div className="h-96 bg-gray-100 rounded-3xl" />
        </div>
    );

    return (
        <div className="space-y-8 relative">
            {/* Real-time Alert Notification */}
            {showRealtimeAlert && (
                <div className="fixed top-24 right-8 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-4 animate-in slide-in-from-right-10 duration-500">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <Bell className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest">Real-time Update</p>
                        <p className="text-sm font-bold">Earnings updated successfully!</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#0F172A] p-6 rounded-3xl text-white shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Commission</p>
                    <h3 className="text-3xl font-black">₹{(earnings?.totalCommission || 0).toLocaleString()}</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                        <ArrowUpRight className="w-3 h-3" /> Live Updates Connected
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pending Payouts</p>
                    <h3 className="text-3xl font-black text-gray-900">₹{(earnings?.pendingPayouts || 0).toLocaleString()}</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-amber-500">
                        <Calendar className="w-3 h-3" /> Auto-sync active
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Avg Order Value</p>
                    <h3 className="text-3xl font-black text-gray-900">₹4,250</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-500">
                        <TrendingUp className="w-3 h-3" /> +8% growth
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Platform Growth</p>
                    <h3 className="text-3xl font-black text-gray-900">18.4%</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-500">
                        <ArrowUpRight className="w-3 h-3" /> Target 20%
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Live Earnings Feed</h3>
                        <p className="text-xs text-gray-400 font-medium">History of all platform fees and commissions</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all">
                        <Download className="w-4 h-4" /> Download Report
                    </button>
                </div>
                <div className="p-4 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 rounded-xl">
                            <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Transaction Details</th>
                                <th className="px-6 py-4">Entity</th>
                                <th className="px-6 py-4">Gross Amt</th>
                                <th className="px-6 py-4">Platform Fee</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {transactions.map((tx, i) => (
                                <tr key={tx.id || i} className={`group hover:bg-gray-50/50 transition-all ${i === 0 && showRealtimeAlert ? 'bg-emerald-50 shadow-inner' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'COMMISSION' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                <IndianRupee className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-800">{tx.details}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(tx.date).toLocaleDateString()} • {new Date(tx.date).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-600">{tx.entity}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-900">₹{tx.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-xs font-black text-emerald-600">
                                        {tx.fee > 0 ? `+₹${tx.fee.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${tx.status === 'CREDITED' || tx.status === 'PROCESSED' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`} />
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${tx.status === 'CREDITED' || tx.status === 'PROCESSED' ? 'text-emerald-600' : 'text-amber-600'}`}>{tx.status}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EarningsManager;
