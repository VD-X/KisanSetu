import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { Search, Filter, Package, User, ShoppingCart, Truck, CheckCircle2, XCircle, Clock, ChevronRight, Eye, FileText, IndianRupee } from 'lucide-react';
import InvoiceModal from '../../InvoiceModal';
import { invoiceService, InvoiceData } from '../../../services/invoiceService';

const OrderMonitor: React.FC = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>({});
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params: any = { page };
            if (statusFilter !== 'ALL') params.status = statusFilter;
            const res = await adminService.getOrders(params);
            setOrders(res.orders || res);
            setPagination(res.pagination || {});
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [statusFilter, page]);

    const handleCancelOrder = async (id: string) => {
        const reason = prompt("Enter cancellation reason:");
        if (!reason) return;
        try {
            await adminService.cancelOrder(id, reason);
            fetchOrders();
        } catch (err) {
            alert("Failed to cancel order");
        }
    };

    const handleDownloadInvoice = (order: any) => {
        const commission = Math.round(order.priceFinal * 0.125);
        const taxes = Math.round(order.priceFinal * 0.05);

        const data: InvoiceData = {
            invoiceId: invoiceService.formatInvoiceId('ADMIN', order.id),
            orderId: order.id,
            date: new Date().toLocaleDateString(),
            completionDate: new Date(order.updatedAt || new Date()).toLocaleDateString(),
            role: 'ADMIN',
            buyer: {
                name: order.buyer?.name || 'Buyer',
                email: order.buyer?.email,
                address: order.deliveryAddress
            },
            farmer: {
                name: order.farmer?.name || 'Farmer',
                location: order.listing?.location,
                farmerId: order.farmerId
            },
            items: [{
                name: order.listing?.crop?.name || 'Market Transaction',
                quantity: order.quantity,
                unit: 'kg',
                pricePerUnit: order.priceFinal / (order.quantity || 1),
                total: order.priceFinal,
                grade: order.listing?.grade
            }],
            delivery: order.delivery ? {
                pickup: order.delivery.pickupLocation?.address || 'N/A',
                drop: order.delivery.dropLocation?.address || 'N/A',
                distance: order.delivery.distance,
                cost: order.delivery.totalCost
            } : undefined,
            breakdown: {
                itemTotal: order.priceFinal,
                transportCharges: order.delivery?.totalCost || 0,
                platformFee: commission,
                taxes: taxes,
                finalTotal: order.priceFinal + (order.delivery?.totalCost || 0) + taxes
            },
            paymentStatus: {
                method: 'System Escrow',
                status: 'PAID',
                transactionId: `ADM-TXN-${order.id.substring(0, 8).toUpperCase()}`
            }
        };

        setInvoiceData(data);
        setShowInvoiceModal(true);
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
            case 'CANCELLED': return 'bg-red-100 text-red-700';
            case 'IN_DELIVERY': return 'bg-blue-100 text-blue-700';
            case 'ORDER_CREATED': return 'bg-amber-100 text-amber-700 font-bold';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6">
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-emerald-500" />
                        Order Monitoring
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mt-1">Real-time status tracking for all platform transactions</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select
                        className="bg-gray-50 border-none rounded-xl text-sm px-4 py-2 focus:ring-2 focus:ring-emerald-500/20"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="ORDER_CREATED">New / Pending</option>
                        <option value="IN_DELIVERY">In Delivery</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order Info</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parties involved</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Value & Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Logistics</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-8"><div className="h-4 bg-gray-50 rounded w-full" /></td></tr>
                                ))
                            ) : orders.map((o) => (
                                <tr key={o.id} className="group hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(o)}>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-gray-900">#{o.id.slice(-8).toUpperCase()}</p>
                                            <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(o.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                                <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-[8px]">F</span>
                                                {o.farmer?.name}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                                <span className="w-4 h-4 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[8px]">B</span>
                                                {o.buyer?.name}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-2">
                                            <p className="text-sm font-black text-gray-900 flex items-center gap-1">
                                                <IndianRupee className="w-3.5 h-3.5 text-gray-400" /> {o.priceFinal.toLocaleString()}
                                            </p>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusStyles(o.orderStatus)}`}>
                                                {o.orderStatus.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {o.delivery ? (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                                                    <Truck className="w-3 h-3" /> {o.delivery.status}
                                                </div>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase truncate max-w-[120px]">
                                                    Tx: {o.delivery.transporter?.name || 'Unassigned'}
                                                </p>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-bold text-gray-300 uppercase italic">Self Pickup</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setSelectedOrder(o)}
                                                className="p-2 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {o.orderStatus === 'COMPLETED' && (
                                                <button
                                                    onClick={() => handleDownloadInvoice(o)}
                                                    className="p-2 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            )}
                                            {o.orderStatus !== 'COMPLETED' && o.orderStatus !== 'CANCELLED' && (
                                                <button
                                                    onClick={() => handleCancelOrder(o.id)}
                                                    className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900">Order #{selectedOrder.id.slice(-8).toUpperCase()}</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Placed on {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusStyles(selectedOrder.orderStatus)}`}>
                                        {selectedOrder.orderStatus.replace('_', ' ')}
                                    </span>
                                    <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-full hover:bg-gray-100 transition-all text-gray-400">
                                        <ChevronRight className="w-6 h-6 rotate-90" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Details Col 1 */}
                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Market Breakdown</h4>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-xl">
                                                    {selectedOrder.listing?.crop?.icon || '🌾'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{selectedOrder.listing?.crop?.name}</p>
                                                    <p className="text-[10px] font-bold text-gray-400">{selectedOrder.quantity} kg @ ₹{Math.round(selectedOrder.priceFinal / selectedOrder.quantity)}/kg</p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-black text-gray-900">₹{selectedOrder.priceFinal.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Transaction Parties</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 border border-gray-100 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">F</div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800">{selectedOrder.farmer?.name}</p>
                                                        <p className="text-[10px] text-gray-400">Farmer Account</p>
                                                    </div>
                                                </div>
                                                <button className="text-[10px] font-bold text-emerald-600 hover:underline">Profile</button>
                                            </div>
                                            <div className="flex items-center justify-between p-3 border border-gray-100 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">B</div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800">{selectedOrder.buyer?.name}</p>
                                                        <p className="text-[10px] text-gray-400">Procurement Partner</p>
                                                    </div>
                                                </div>
                                                <button className="text-[10px] font-bold text-blue-600 hover:underline">Profile</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Details Col 2 */}
                                <div className="space-y-6">
                                    <div className="bg-[#0F172A] p-6 rounded-2xl text-white">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Logistics Tracking</h4>
                                        {selectedOrder.delivery ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-500">
                                                            <Truck className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold">{selectedOrder.delivery.status}</p>
                                                            <p className="text-[10px] text-gray-400 font-medium">Estimated: {selectedOrder.delivery.eta || 'Calculating...'}</p>
                                                        </div>
                                                    </div>
                                                    <button className="px-4 py-1.5 bg-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-all">Track Live</button>
                                                </div>
                                                <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                                                        {selectedOrder.delivery.transporter?.name?.charAt(0) || 'T'}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Transporter Assigned</p>
                                                        <p className="text-xs font-bold">{selectedOrder.delivery.transporter?.name || 'Searching...'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-8 text-center bg-white/5 rounded-xl border border-white/5">
                                                <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Self Pickup Arranged</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Platform Actions</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedOrder.orderStatus === 'COMPLETED' && (
                                                <button
                                                    onClick={() => handleDownloadInvoice(selectedOrder)}
                                                    className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center gap-2 hover:bg-emerald-50 transition-all group"
                                                >
                                                    <FileText className="w-5 h-5 text-gray-400 group-hover:text-emerald-500" />
                                                    <span className="text-[10px] font-bold text-gray-600">Download Invoice</span>
                                                </button>
                                            )}
                                            <button className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center gap-2 hover:bg-blue-50 transition-all group">
                                                <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                                                <span className="text-[10px] font-bold text-gray-600">Audit History</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {invoiceData && (
                <InvoiceModal
                    isOpen={showInvoiceModal}
                    onClose={() => setShowInvoiceModal(false)}
                    data={invoiceData}
                />
            )}
        </div>
    );
};

export default OrderMonitor;
