import React, { useState, useEffect } from 'react';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    Clock,
    CheckCircle2,
    AlertCircle,
    CreditCard,
    Plus,
    Truck,
    Info,
    RefreshCw,
    Shield
} from 'lucide-react';
import api from '../services/api';

interface Transaction {
    id: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    description: string;
    status: string;
    createdAt: string;
}

interface DeliveryPayment {
    id: string;
    orderId: string;
    totalCost: number;
    status: string;
    paymentStatus: string;
    order?: {
        listing?: {
            crop?: {
                name: string;
            }
        }
    }
}

const getTransactionDetails = (description: string, type: 'CREDIT' | 'DEBIT') => {
    const desc = description.toLowerCase();
    if (type === 'CREDIT') {
        return { icon: <ArrowDownLeft className="w-5 h-5" />, color: 'bg-green-100 text-green-600', label: 'Wallet Top-up' };
    }
    if (desc.includes('crop purchase')) {
        return { icon: <Plus className="w-5 h-5 rotate-45" />, color: 'bg-emerald-100 text-emerald-600', label: 'Crop Payment' };
    }
    if (desc.includes('delivery fee')) {
        return { icon: <Truck className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600', label: 'Delivery Fee' };
    }
    if (desc.includes('platform fee')) {
        return { icon: <Shield className="w-5 h-5" />, color: 'bg-purple-100 text-purple-600', label: 'Platform Fee' };
    }
    return { icon: <ArrowUpRight className="w-5 h-5" />, color: 'bg-red-100 text-red-600', label: 'Payment' };
};

const BuyerPaymentsView: React.FC = () => {
    const [balance, setBalance] = useState<number>(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [pendingDeliveries, setPendingDeliveries] = useState<DeliveryPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [payingId, setPayingId] = useState<string | null>(null);
    const [addingFunds, setAddingFunds] = useState(false);
    const [fundAmount, setFundAmount] = useState('1000');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [walletRes, ordersRes] = await Promise.all([
                api.wallet.get(),
                api.order.getAll()
            ]);

            setBalance(walletRes.wallet.balance);
            setTransactions(walletRes.wallet.transactions);

            // Filter for orders that have a delivery with PENDING payment status
            const pendingDeals: DeliveryPayment[] = ordersRes.orders
                .filter((o: any) => o.delivery && o.delivery.paymentStatus === 'PENDING')
                .map((o: any) => ({
                    ...o.delivery,
                    order: o
                }));

            setPendingDeliveries(pendingDeals);
        } catch (error) {
            console.error('Error fetching payment data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePayDelivery = async (deliveryId: string) => {
        setPayingId(deliveryId);
        try {
            await api.deliveryDeal.pay(deliveryId);
            await fetchData();
            // Show success toast or similar
        } catch (error: any) {
            alert(error.message || 'Payment failed');
        } finally {
            setPayingId(null);
        }
    };

    const handleAddFunds = async () => {
        setAddingFunds(true);
        try {
            await api.wallet.addFunds(parseFloat(fundAmount));
            await fetchData();
            setAddingFunds(false);
        } catch (error) {
            alert('Failed to add funds');
            setAddingFunds(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCw className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-3 md:p-4 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Wallet Header */}
            <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-100 opacity-80 uppercase tracking-widest text-[9px] md:text-sm font-semibold">
                            <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            KisanSetu Wallet
                        </div>
                        <div>
                            <span className="text-3xl md:text-4xl font-bold">₹{balance.toLocaleString()}</span>
                            <span className="ml-2 text-green-200 text-xs md:text-base">available balance</span>
                        </div>
                    </div>
                    <div className="w-full md:w-auto">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 md:p-4 flex items-center justify-between md:justify-start gap-4 border border-white/20">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-white/50">₹</span>
                                <input
                                    id="fundAmount"
                                    type="number"
                                    value={fundAmount}
                                    onChange={(e) => setFundAmount(e.target.value)}
                                    className="bg-transparent text-white placeholder-green-200 border-none outline-none w-16 md:w-24 font-bold text-lg"
                                    placeholder="0.00"
                                />
                            </div>
                            <button
                                id="addFundsBtn"
                                onClick={handleAddFunds}
                                disabled={addingFunds}
                                className="bg-white text-green-700 px-4 md:px-6 py-2 rounded-xl font-bold hover:bg-green-50 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 whitespace-nowrap text-sm md:text-base"
                            >
                                <Plus className="w-4 h-4 md:w-5 md:h-5 font-black" />
                                <span className="hidden xs:inline">Add Funds</span>
                                <span className="xs:hidden">Add</span>
                            </button>
                        </div>
                    </div>
                </div>
                {/* Decorative background circle */}
                <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            </div>

            <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
                {/* Pending Payments Section */}
                <div className="lg:col-span-1 space-y-4 md:space-y-6">
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-500" />
                        Action Required
                    </h2>

                    {pendingDeliveries.length === 0 ? (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 md:p-6 text-center space-y-3">
                            <Info className="w-8 h-8 text-amber-400 mx-auto" />
                            <p className="text-amber-800 font-medium">No pending payments</p>
                            <p className="text-amber-600 text-[11px] leading-relaxed">Arranged delivery fees will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingDeliveries.map((delivery) => (
                                <div key={delivery.id} className="bg-white border-2 border-amber-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-amber-100 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                                            <Truck className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-amber-700 block leading-none">₹{delivery.totalCost}</span>
                                            <span className="text-[10px] text-gray-400 font-mono">#{delivery.id.slice(-6).toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1 mb-5">
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Delivery Fee</p>
                                        <p className="font-bold text-gray-800">For {delivery.order?.listing?.crop?.name || 'Order'}</p>
                                    </div>
                                    <button
                                        id={`payDelivery-${delivery.id}`}
                                        onClick={() => handlePayDelivery(delivery.id)}
                                        disabled={payingId === delivery.id || balance < delivery.totalCost}
                                        className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm ${balance >= delivery.totalCost
                                            ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-200 active:scale-[0.98]'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {payingId === delivery.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                        {balance >= delivery.totalCost ? 'Pay Now' : 'Insufficient Balance'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Transaction History Section */}
                <div className="lg:col-span-2 space-y-4 md:space-y-6">
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-green-600" />
                        Detailed History
                    </h2>

                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                                                Your transaction history will appear here.
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((tx) => {
                                            const details = getTransactionDetails(tx.description, tx.type);
                                            return (
                                                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${details.color}`}>
                                                                {details.icon}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-gray-800 leading-tight truncate">{tx.description}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${tx.type === 'CREDIT' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                                        {details.label}
                                                                    </span>
                                                                    <span className="text-[9px] text-gray-300 font-bold tracking-widest uppercase">{tx.type}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`px-6 py-5 text-right font-black text-lg ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-gray-900'}`}>
                                                        {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${tx.status === 'SUCCESS' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                            }`}>
                                                            {tx.status === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <p className="text-sm font-bold text-gray-700">
                                                            {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-black uppercase mt-0.5">
                                                            {new Date(tx.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {transactions.length === 0 ? (
                            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-400 italic">
                                No transactions yet.
                            </div>
                        ) : (
                            transactions.map((tx) => {
                                const details = getTransactionDetails(tx.description, tx.type);
                                return (
                                    <div key={tx.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${details.color}`}>
                                                    {details.icon}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 line-tight">{tx.description}</p>
                                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                                                        {new Date(tx.createdAt).toLocaleDateString()} · {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className={`text-base font-black ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-gray-900'}`}>
                                                {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${tx.type === 'CREDIT' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {details.label}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${tx.status === 'SUCCESS' ? 'text-green-600' : 'text-amber-600'}`}>
                                                {tx.status === 'SUCCESS' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                                                {tx.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuyerPaymentsView;
