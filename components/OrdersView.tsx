import React, { useState, useEffect } from 'react';
import { Package, Truck, Clock, MapPin, X, AlertCircle, FileText, Download } from 'lucide-react';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { Order, DeliveryDeal, UserRole, OrderStatus } from '../types';
import { orderAPI, deliveryDealAPI } from '../services/api';
import { socketService } from '../services/socketService';
import { InvoiceData, invoiceService } from '../services/invoiceService';
import DeliveryTimeline from './DeliveryTimeline';
import OTPModal from './OTPModal';
import StatusBadge from './StatusBadge';
import InvoiceModal from './InvoiceModal';
import SelfPickupView from './SelfPickupView';

const OrdersView: React.FC = () => {
    const navigate = useNavigate();
    const { success, error, info } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [currentOtp, setCurrentOtp] = useState('');



    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [selfPickupOrderId, setSelfPickupOrderId] = useState<string | null>(null);

    // Filter helpers
    // Filter helpers
    const isActiveOrder = (order: Order) => {
        // If delivery is completed/delivered, it's not active regardless of order status
        if (order.delivery && ['DELIVERED', 'COMPLETED'].includes(order.delivery.status)) {
            return false;
        }
        return ['ORDER_CREATED', 'DELIVERY_PENDING', 'IN_DELIVERY', 'AWAITING_PICKUP'].includes(order.orderStatus);
    };

    const isHistoryOrder = (order: Order) => {
        // If delivery is completed/delivered, it is history
        if (order.delivery && ['DELIVERED', 'COMPLETED'].includes(order.delivery.status)) {
            return true;
        }
        return ['COMPLETED', 'CANCELLED'].includes(order.orderStatus);
    };

    const filteredOrders = orders.filter(order => {
        if (activeTab === 'active') return isActiveOrder(order);
        return isHistoryOrder(order);
    });

    useEffect(() => {
        loadOrders();

        // Connect to WebSocket
        socketService.connect();
        const cleanups: (() => void)[] = [];

        // Listen for delivery updates
        cleanups.push(socketService.onDeliveryAccepted((data) => {
            console.log('Delivery accepted:', data);
            loadOrders();
        }));

        cleanups.push(socketService.onDeliveryOtpVerified((data) => {
            console.log('OTP verified:', data);
            loadOrders();
        }));

        cleanups.push(socketService.onDeliveryStatusUpdate((data) => {
            console.log('Delivery status updated:', data);
            loadOrders();
        }));

        cleanups.push(socketService.onDeliveryCompleted((data) => {
            console.log('Delivery completed:', data);
            loadOrders();
        }));

        return () => {
            cleanups.forEach(cleanup => cleanup());
        };
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const response = await orderAPI.getAll();
            setOrders(response.orders || []);

            // Join rooms for all orders
            response.orders?.forEach((order: Order) => {
                socketService.joinOrderRoom(order.id);
            });
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewTracking = (order: Order) => {
        if (order.delivery) {
            navigate(`/tracking/${order.delivery.id}`);
        }
    };

    const handleShowOtp = (order: Order) => {
        return;
    };

    const handleArrangeDeliveryClick = (order: Order) => {
        navigate(`/arrange-delivery/${order.id}`);
    };

    const handleDownloadInvoice = (order: Order) => {
        if (!order.listing || !order.farmer) return;

        const data: InvoiceData = {
            invoiceId: invoiceService.formatInvoiceId('BUYER', order.id),
            orderId: order.id,
            date: new Date().toLocaleDateString(),
            completionDate: new Date(order.updatedAt).toLocaleDateString(),
            role: 'BUYER',
            buyer: {
                name: order.buyer?.name || 'Valued Buyer',
                email: 'buyer@example.com', // In real app, get from user context or order
                address: order.deliveryAddress || 'Default Address',
            },
            farmer: {
                name: order.farmer.name || 'Professional Farmer',
                location: order.listing.location,
            },
            items: [{
                name: order.listing.crop?.name || 'Crop Purchase',
                quantity: order.quantity,
                unit: 'kg',
                pricePerUnit: order.priceFinal / order.quantity,
                total: order.priceFinal,
                grade: order.listing.grade
            }],
            delivery: order.delivery ? {
                pickup: order.delivery.pickupLocation?.address || 'Farm Office',
                drop: order.delivery.dropLocation?.address || 'Buyer Warehouse',
                distance: order.delivery.distance,
                cost: order.delivery.totalCost
            } : undefined,
            breakdown: {
                itemTotal: order.priceFinal,
                transportCharges: order.delivery?.totalCost || 0,
                platformFee: Math.round(order.priceFinal * 0.05), // 5% fee
                taxes: Math.round(order.priceFinal * 0.02), // 2% GST
                finalTotal: order.priceFinal + (order.delivery?.totalCost || 0) + Math.round(order.priceFinal * 0.07)
            },
            paymentStatus: {
                method: 'KisanSetu Wallet',
                status: 'PAID',
                transactionId: `TXN-${order.id.substring(0, 8).toUpperCase()}`
            }
        };

        setInvoiceData(data);
        setShowInvoiceModal(true);
    };



    const handleCancelOrder = async (order: Order) => {
        if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) return;

        try {
            await orderAPI.cancel(order.id);
            success('Order cancelled successfully.');
            loadOrders();
        } catch (err: any) {
            error(err.message || 'Failed to cancel order');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-4xl text-green-600 mb-4"></i>
                    <p className="text-sm font-bold text-gray-500">Loading orders...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6 pb-24">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">My Orders</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {filteredOrders.length} {activeTab} orders
                        </p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex bg-gray-100 p-1 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'active'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            History
                        </button>
                    </div>
                </div>

                {/* Orders List */}
                {filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className={`fas ${activeTab === 'active' ? 'fa-box-open' : 'fa-history'} text-3xl text-gray-300`}></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No {activeTab} orders</h3>
                        <p className="text-sm text-gray-500">
                            {activeTab === 'active'
                                ? 'Your active orders will appear here'
                                : 'Your past orders will appear here'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order) => (
                            <div key={order.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                                {/* Order Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900">
                                            {order.listing?.crop?.name || 'Order'}
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-1">Order ID: #{order.id.slice(0, 8)}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Farmer: {order.farmer?.name} • {order.listing?.location}
                                        </p>
                                    </div>
                                    <StatusBadge status={order.orderStatus} type="order" />
                                    {order.deliveryMode === 'SELF_PICKUP' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 ml-2">
                                            <i className="fas fa-person-walking"></i>
                                            Self Pickup
                                        </span>
                                    )}
                                </div>

                                {/* Order Details */}
                                <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                                    <div className="grid grid-cols-3 gap-4 mb-4">
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
                                                {order.deliveryResponsibility === 'FARMER_ARRANGED' ? 'Farmer' : 'Buyer'}
                                            </p>
                                        </div>
                                    </div>

                                    {order.deliveryAddress && (
                                        <div className="pt-3 border-t border-gray-200">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 mr-4">
                                                    <p className="text-xs text-gray-500 mb-1">Delivery Location</p>
                                                    <div className="flex items-start gap-2">
                                                        <i className="fas fa-map-marker-alt text-green-600 mt-1"></i>
                                                        <p className="text-sm font-bold text-gray-900 line-clamp-2">{order.deliveryAddress}</p>
                                                    </div>
                                                </div>
                                                {(order.distanceKm || order.estimatedDuration) && (
                                                    <div className="text-right whitespace-nowrap">
                                                        <p className="text-xs text-gray-500 mb-1">Est. Travel</p>
                                                        <p className="text-sm font-bold text-gray-900">
                                                            {order.distanceKm ? `${order.distanceKm} km` : ''}
                                                        </p>
                                                        {order.estimatedDuration && (
                                                            <p className="text-xs text-gray-500">
                                                                ~{Math.round(order.estimatedDuration)} mins
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

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

                                        {/* Transporter Info */}
                                        {order.delivery.transporter && (
                                            <div className="bg-blue-50 rounded-2xl p-4 mb-4">
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

                                        {/* OTP Display - Delivery */}
                                        {order.delivery.deliveryOtp &&
                                            !['DELIVERED', 'COMPLETED'].includes(order.delivery.status) && (
                                                <div className="w-full bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-4 animate-pulse-once">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                                <i className="fas fa-shield-alt text-blue-600 text-lg"></i>
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-0.5">Delivery OTP</p>
                                                                <p className="text-2xl font-black text-blue-700 tracking-[0.3em]">{order.delivery.deliveryOtp}</p>
                                                                <p className="text-[10px] text-gray-500 mt-0.5">Share with transporter when they arrive</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        {/* Action Buttons */}
                                        <div className="flex gap-3">
                                            {order.delivery.status !== 'DELIVERED' && order.delivery.status !== 'COMPLETED' && (
                                                <button
                                                    onClick={() => handleViewTracking(order)}
                                                    className="flex-1 bg-gray-900 text-white py-3 rounded-2xl font-bold text-sm hover:bg-gray-800 active:scale-95 transition-all"
                                                >
                                                    <i className="fas fa-map-marked-alt mr-2"></i>
                                                    View Tracking
                                                </button>
                                            )}




                                        </div>
                                    </div>
                                )}

                                {/* No Delivery Yet */}
                                {!order.delivery && order.orderStatus === 'ORDER_CREATED' && (
                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
                                            <i className="fas fa-clock text-yellow-600 text-2xl mb-2"></i>
                                            <p className="text-sm font-bold text-gray-700">Waiting for delivery arrangement</p>
                                            <p className="text-xs text-gray-500 mt-2 mb-3">
                                                {order.deliveryResponsibility === 'FARMER_ARRANGED'
                                                    ? 'Farmer will arrange delivery soon'
                                                    : 'Please arrange delivery for this order'}
                                            </p>

                                            {order.deliveryResponsibility === 'BUYER_ARRANGED' && (
                                                <button
                                                    onClick={() => handleArrangeDeliveryClick(order)}
                                                    className="bg-gray-900 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-gray-800 transition-all"
                                                >
                                                    Arrange Delivery Now
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleCancelOrder(order)}
                                                className="ml-3 text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                            >
                                                Cancel Order
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Self Pickup - Awaiting Pickup */}
                                {!order.delivery && order.orderStatus === 'AWAITING_PICKUP' && (order.deliveryMode === 'SELF_PICKUP' || !order.deliveryMode) && (
                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-5 text-center">
                                            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
                                                <i className="fas fa-person-walking text-emerald-600 text-2xl"></i>
                                            </div>
                                            <p className="text-sm font-black text-emerald-800 mb-1">Self Pickup Order</p>
                                            <p className="text-xs text-emerald-600 mb-4">
                                                Pick up your order from the farmer and verify with OTP
                                            </p>
                                            <button
                                                onClick={() => setSelfPickupOrderId(order.id)}
                                                className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"
                                            >
                                                <i className="fas fa-shield-halved mr-2"></i>
                                                View Pickup OTP
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {/* Invoice Download - For any completed order */}
                                {(order.orderStatus === 'COMPLETED' || (order.delivery && ['DELIVERED', 'COMPLETED'].includes(order.delivery.status))) && (
                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                        <button
                                            onClick={() => handleDownloadInvoice(order)}
                                            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <i className="fas fa-file-invoice"></i>
                                            Download Invoice
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Tracking Modal */}
                {selectedOrder && selectedOrder.delivery && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#f8f9fa]/95 via-white/85 to-[#e9ecef]/95 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">Delivery Tracking</h2>
                                    <p className="text-sm text-gray-500 mt-1">Order #{selectedOrder.id.slice(0, 8)}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                                    aria-label="Close"
                                >
                                    <i className="fas fa-times text-gray-600"></i>
                                </button>
                            </div>

                            <DeliveryTimeline
                                currentStatus={selectedOrder.delivery.status}
                                role="BUYER"
                            />

                            {/* Delivery Details */}
                            <div className="mt-6 space-y-4">
                                <div className="bg-gray-50 rounded-2xl p-4">
                                    <p className="text-xs text-gray-500 mb-2">Pickup Location</p>
                                    <p className="text-sm font-bold text-gray-900">
                                        {selectedOrder.delivery.pickupLocation.address}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-4">
                                    <p className="text-xs text-gray-500 mb-2">Drop Location</p>
                                    <p className="text-sm font-bold text-gray-900">
                                        {selectedOrder.delivery.dropLocation.address}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Distance</p>
                                            <p className="text-lg font-black text-gray-900">{selectedOrder.delivery.distance} km</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 mb-1">Delivery Cost</p>
                                            <p className="text-lg font-black text-gray-900">₹{selectedOrder.delivery.totalCost}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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



                {/* Invoice Modal */}
                {invoiceData && (
                    <InvoiceModal
                        isOpen={showInvoiceModal}
                        onClose={() => setShowInvoiceModal(false)}
                        data={invoiceData}
                    />
                )}
            </div>

            {/* Self Pickup View Modal */}
            {
                selfPickupOrderId && (
                    <SelfPickupView
                        orderId={selfPickupOrderId}
                        userRole="BUYER"
                        onComplete={() => {
                            setSelfPickupOrderId(null);
                            loadOrders();
                        }}
                        onClose={() => setSelfPickupOrderId(null)}
                    />
                )
            }
        </>
    );
};

export default OrdersView;
