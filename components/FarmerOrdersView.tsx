import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Order, DeliveryDeal, VehicleType } from '../types';
import { orderAPI, deliveryDealAPI } from '../services/api';
import { socketService } from '../services/socketService';
import { TRANS_VEHICLES } from '../constants';
import OTPModal from './OTPModal';
import StatusBadge from './StatusBadge';
import DeliveryTimeline from './DeliveryTimeline';

interface FarmerOrdersViewProps {
    onClose?: () => void;
}

const FarmerOrdersView: React.FC<FarmerOrdersViewProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState<'active' | 'history'>('active');
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [currentOtp, setCurrentOtp] = useState('');
    const [proofPreview, setProofPreview] = useState<string | null>(null);


    useEffect(() => {
        loadOrders();

        socketService.connect();
        socketService.onDeliveryAccepted(() => loadOrders());
        socketService.onDeliveryOtpVerified(() => loadOrders());
        socketService.onDeliveryStatusUpdate(() => loadOrders());

        return () => {
            socketService.removeAllListeners();
        };
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const response = await orderAPI.getAll();
            setOrders(response.orders || []);

            response.orders?.forEach((order: Order) => {
                socketService.joinOrderRoom(order.id);
            });
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleArrangeDelivery = (order: Order) => {
        navigate(`/arrange-delivery/${order.id}`);
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <i className="fas fa-spinner fa-spin text-4xl text-green-600"></i>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">My Orders</h2>
                    <p className="text-sm text-gray-500 mt-1">{orders.length} total orders</p>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                        aria-label="Close"
                    >
                        <i className="fas fa-times text-gray-600"></i>
                    </button>
                )}
            </div>

            {/* Sub-Tabs Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-2xl w-full">
                <button
                    onClick={() => setActiveSubTab('active')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'active' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Active Load
                    <span className="ml-2 bg-gray-200 px-1.5 py-0.5 rounded text-[8px]">
                        {orders.filter(o => o.orderStatus !== 'COMPLETED' && o.orderStatus !== 'CANCELLED').length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveSubTab('history')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'history' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    History
                    <span className="ml-2 bg-gray-200 px-1.5 py-0.5 rounded text-[8px]">
                        {orders.filter(o => o.orderStatus === 'COMPLETED' || o.orderStatus === 'CANCELLED').length}
                    </span>
                </button>
            </div>

            {/* Orders List */}
            {orders.filter(order => {
                const isFinal = order.orderStatus === 'COMPLETED' || order.orderStatus === 'CANCELLED';
                return activeSubTab === 'history' ? isFinal : !isFinal;
            }).length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-box text-3xl text-gray-300"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {activeSubTab === 'active' ? 'No active orders' : 'No order history'}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {activeSubTab === 'active'
                            ? 'Ongoing orders will appear here'
                            : 'Completed and cancelled orders will be stored here'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders
                        .filter(order => {
                            const isFinal = order.orderStatus === 'COMPLETED' || order.orderStatus === 'CANCELLED';
                            return activeSubTab === 'history' ? isFinal : !isFinal;
                        })
                        .map((order) => (
                            <div key={order.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                                {/* Order Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900">
                                            {order.listing?.crop?.name || 'Order'}
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-1">Order ID: #{order.id.slice(0, 8)}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Buyer: {order.buyer?.name}
                                        </p>
                                    </div>
                                    <StatusBadge status={order.orderStatus} type="order" />
                                </div>

                                {/* Order Details */}
                                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-2xl">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Quantity</p>
                                        <p className="text-lg font-black text-gray-900">{order.quantity} kg</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Price</p>
                                        <p className="text-lg font-black text-gray-900">₹{order.priceFinal.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Delivery</p>
                                        <p className="text-xs font-bold text-gray-700">
                                            {order.deliveryResponsibility === 'FARMER_ARRANGED' ? 'You Arrange' : 'Buyer Arranges'}
                                        </p>
                                    </div>
                                </div>

                                {/* Delivery Actions */}
                                {order.deliveryResponsibility === 'FARMER_ARRANGED' && !order.delivery && (
                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                        <button
                                            onClick={() => handleArrangeDelivery(order)}
                                            className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all"
                                        >
                                            <i className="fas fa-truck mr-2"></i>
                                            Arrange Delivery
                                        </button>
                                    </div>
                                )}

                                {/* No Delivery Yet - Show Info */}
                                {!order.delivery && order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'COMPLETED' && (
                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                        <div className="text-center py-4 bg-gray-50 rounded-2xl">
                                            <i className="fas fa-truck text-gray-300 text-2xl mb-2"></i>
                                            <p className="text-sm text-gray-500 mb-3">No delivery arranged yet</p>
                                            {order.deliveryResponsibility === 'FARMER_ARRANGED' ? (
                                                <p className="text-xs text-gray-400">Click "Arrange Delivery" above to enable tracking</p>
                                            ) : (
                                                <p className="text-xs text-gray-400">Waiting for buyer to arrange delivery</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Delivery Status */}
                                {order.delivery && (
                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-truck text-green-600"></i>
                                                <span className="text-sm font-bold text-gray-700">Delivery Status</span>
                                            </div>
                                            <StatusBadge status={order.delivery.status} type="delivery" />
                                        </div>

                                        {/* OTP Display */}
                                        {order.delivery.pickupOtp && order.delivery.status === 'TRANSPORTER_ASSIGNED' && (
                                            <button
                                                onClick={() => {
                                                    setCurrentOtp(order.delivery!.pickupOtp!);
                                                    setShowOtpModal(true);
                                                }}
                                                className="w-full bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-4 hover:bg-green-100 transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <i className="fas fa-lock text-green-600 text-xl"></i>
                                                        <div className="text-left">
                                                            <p className="text-xs text-gray-600">Pickup OTP</p>
                                                            <p className="text-lg font-black text-green-600">Click to view</p>
                                                        </div>
                                                    </div>
                                                    <i className="fas fa-chevron-right text-green-600"></i>
                                                </div>
                                            </button>
                                        )}

                                        {/* Transporter Info */}
                                        {order.delivery.transporter && (
                                            <div className="bg-blue-50 rounded-2xl p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <i className="fas fa-user text-blue-600"></i>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Transporter</p>
                                                        <p className="text-sm font-bold text-gray-900">{order.delivery.transporter.name}</p>
                                                        <p className="text-xs text-gray-500">{order.delivery.transporter.phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tracking Button */}
                                        {order.delivery.status !== 'DELIVERED' && order.delivery.status !== 'COMPLETED' && (
                                            <button
                                                onClick={() => navigate(`/tracking/${order.delivery?.id}`)}
                                                className="w-full bg-gray-900 text-white py-3 rounded-2xl font-bold text-sm hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                <i className="fas fa-map-marked-alt"></i>
                                                View Live Tracking
                                            </button>
                                        )}

                                        {Array.isArray(order.delivery.proofPhotos) && order.delivery.proofPhotos.length > 0 && (
                                            <div className="pt-4 border-t border-gray-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Delivery Proof</p>
                                                    <span className="text-[9px] font-black uppercase tracking-widest bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full">
                                                        Proof Uploaded
                                                    </span>
                                                </div>
                                                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                                                    {order.delivery.proofPhotos.slice(-3).map((src, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => setProofPreview(src)}
                                                            className="shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50"
                                                            title="View proof photo"
                                                            aria-label="View proof photo"
                                                        >
                                                            <img src={src} alt="Delivery proof" className="w-full h-full object-cover" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                </div>
            )}


            {/* OTP Modal */}
            <OTPModal
                isOpen={showOtpModal}
                onClose={() => setShowOtpModal(false)}
                mode="display"
                otp={currentOtp}
                title="Pickup OTP"
            />

            {/* Proof Photo Lightbox */}
            {proofPreview && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setProofPreview(null)}
                    role="dialog"
                    aria-label="Proof photo preview"
                >
                    <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setProofPreview(null)}
                            className="absolute -top-12 right-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                            aria-label="Close preview"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                        <img
                            src={proofPreview}
                            alt="Delivery proof"
                            className="w-full rounded-2xl shadow-2xl object-contain max-h-[75vh]"
                        />
                        <p className="text-center text-white/70 text-xs mt-3 font-bold uppercase tracking-widest">
                            Delivery Proof Photo — Uploaded by Transporter
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FarmerOrdersView;
