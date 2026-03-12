
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DeliveryVehicleSelector from '../components/DeliveryVehicleSelector';
import { VehicleType, Order } from '../types';
import { orderAPI, deliveryDealAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

import { TRANS_VEHICLES } from '../constants';

const ArrangeDeliveryPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
    const [calculatedCost, setCalculatedCost] = useState<number>(0);
    const [distance, setDistance] = useState<number>(0);

    useEffect(() => {
        if (!orderId) return;
        loadOrder();
    }, [orderId]);

    const loadOrder = async () => {
        try {
            const data = await orderAPI.getById(orderId!);
            setOrder(data.order);
            if (data.order.distanceKm) setDistance(data.order.distanceKm);
        } catch (err: any) {
            error("Failed to load order details");
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    const handleVehicleSelect = (vehicle: VehicleType, cost: number) => {
        setSelectedVehicle(vehicle);
        setCalculatedCost(cost);
    };

    const handleConfirm = async () => {
        if (!order || !selectedVehicle) return;

        try {
            await deliveryDealAPI.create({
                orderId: order.id,
                pickupLocation: {
                    address: order.listing?.location || 'Farmer Location',
                    lat: order.listing?.farmer?.farmerProfile?.latitude,
                    lng: order.listing?.farmer?.farmerProfile?.longitude
                },
                dropLocation: {
                    address: order.deliveryAddress || 'Buyer Location',
                    lat: order.deliveryLatitude,
                    lng: order.deliveryLongitude
                },
                distance,
                pricePerKm: selectedVehicle.perKmPrice,
                selectedVehicle: selectedVehicle.name,
                totalCost: calculatedCost, // Sending the UI calculated cost
                estimatedDuration: Math.round(distance * 2) // Rough estimate
            });

            success('Delivery arranged! Please complete payment to notify transporters.');
            // Force navigation to payments tab
            localStorage.setItem('pending_tab', 'payments');
            navigate(-1);
        } catch (err: any) {
            error(err.message || 'Failed to arrange delivery');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!order) return null;

    // Construct location objects for the selector
    const pickupLoc = {
        latitude: order.listing?.farmer?.farmerProfile?.latitude || null,
        longitude: order.listing?.farmer?.farmerProfile?.longitude || null,
        address: order.listing?.location || '',
        district: order.listing?.farmer?.farmerProfile?.district || '',
        state: order.listing?.farmer?.farmerProfile?.state || ''
    };

    const dropLoc = {
        latitude: order.deliveryLatitude || null,
        longitude: order.deliveryLongitude || null,
        address: order.deliveryAddress || '',
        district: (order.buyer as any)?.buyerProfile?.district || '',
        state: (order.buyer as any)?.buyerProfile?.state || ''
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-32">
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slideUp 0.6s ease-out forwards;
                }
            `}</style>
            {/* Header */}
            <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200 px-4 py-4 flex items-center gap-4">
                <button
                    onClick={() => {
                        localStorage.setItem('pending_tab', 'orders');
                        navigate(-1);
                    }}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <div>
                    <h1 className="text-gray-900 font-bold text-lg">Arrange Delivery</h1>
                    <p className="text-gray-500 text-xs">Order #{order.id?.slice(0, 8)} • {order.quantity}kg {order.listing?.crop?.name}</p>
                </div>
            </div>

            <DeliveryVehicleSelector
                vehicles={TRANS_VEHICLES}
                selectedVehicle={selectedVehicle}
                onVehicleSelect={handleVehicleSelect}
                pickupLocation={pickupLoc}
                dropLocation={dropLoc}
                distanceKm={distance}
                totalKg={order.quantity}
                onDistanceCalculated={setDistance}
            />

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-2xl border-t border-gray-100 z-50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-6">
                    <div className="flex flex-col">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Cost</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-green-600">₹</span>
                            <span className="text-3xl font-black text-gray-900 tracking-tight">
                                {calculatedCost.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedVehicle}
                        className="flex-1 max-w-[280px] bg-gradient-to-r from-green-400 to-emerald-600 hover:from-green-500 hover:to-emerald-700 text-white font-black py-5 px-8 rounded-[2rem] shadow-xl shadow-green-200 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-3 text-lg"
                    >
                        Confirm & Pay
                        <i className="fas fa-arrow-right text-sm opacity-50"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ArrangeDeliveryPage;
