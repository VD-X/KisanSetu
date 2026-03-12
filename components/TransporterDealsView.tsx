import React, { useState } from 'react';
import { DeliveryDeal } from '../types';
import { deliveryDealAPI } from '../services/api';
import OTPModal from './OTPModal';
import StatusBadge from './StatusBadge';
import DeliveryTimeline from './DeliveryTimeline';
import ProofOfDeliveryModal from './ProofOfDeliveryModal';
import TransporterTrackingMap from './TransporterTrackingMap';
import { calculateDistance } from '../utils/deliveryUtils';

interface TransporterDealsViewProps {
    availableDeals: DeliveryDeal[];
    myDeals: DeliveryDeal[];
    loading?: boolean;
    onRefresh: () => void;
    mode: 'available' | 'active' | 'history';
    onViewEarningDetails?: (deal: DeliveryDeal) => void;
}

const TransporterDealsView: React.FC<TransporterDealsViewProps> = ({
    availableDeals,
    myDeals,
    loading = false,
    onRefresh,
    mode,
    onViewEarningDetails
}) => {
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [showPoDModal, setShowPoDModal] = useState(false);
    const [selectedDeal, setSelectedDeal] = useState<DeliveryDeal | null>(null);

    // Internal socket logic removed - handled by parent Dashboard now

    // Helper to get current location
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

    React.useEffect(() => {
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.error(err),
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);


    const handleAcceptDeal = async (dealId: string) => {
        try {
            await deliveryDealAPI.accept(dealId);
            onRefresh();
            // setView('active'); // Removed as view is now controlled by parent
        } catch (error: any) {
            alert(error.message || 'Failed to accept deal');
        }
    };

    const handleDeclineDeal = async (dealId: string) => {
        try {
            await deliveryDealAPI.decline(dealId);
            onRefresh(); // Refresh to update list from server (or optimistic update if desired, but refresh is safer for sync)
        } catch (error: any) {
            alert(error.message || 'Failed to decline deal');
        }
    };

    const handleVerifyOtp = async (otp: string) => {
        if (!selectedDeal) return;
        await deliveryDealAPI.verifyOtp(selectedDeal.id, otp);
        setShowOtpModal(false);
        setSelectedDeal(null);
        onRefresh();
    };

    const handleUpdateStatus = async (dealId: string, newStatus: string) => {
        try {
            await deliveryDealAPI.updateStatus(dealId, newStatus);
            onRefresh();
        } catch (error: any) {
            alert(error.message || 'Failed to update status');
        }
    };

    const handlePoDSubmit = async (data: { imageData: string; otp: string }) => {
        if (!selectedDeal) return;

        try {
            await deliveryDealAPI.uploadProofPhoto(selectedDeal.id, data.imageData);
            await deliveryDealAPI.verifyOtp(selectedDeal.id, data.otp);
            setShowPoDModal(false);
            setSelectedDeal(null);
            onRefresh();
        } catch (error: any) {
            alert(error.message || 'Failed to complete delivery');
        }
    };

    const getNextStatus = (currentStatus: string) => {
        switch (currentStatus) {
            case 'TRANSPORTER_ASSIGNED':
                return { label: 'Verify Pickup OTP', next: 'PICKED_UP', icon: 'fa-lock', action: 'otp' };
            case 'PICKED_UP':
                return { label: 'Start Transit', next: 'IN_TRANSIT', icon: 'fa-truck-fast', action: 'status' };
            case 'IN_TRANSIT':
                return { label: 'Out for Delivery', next: 'OUT_FOR_DELIVERY', icon: 'fa-map-location-dot', action: 'status' };
            case 'OUT_FOR_DELIVERY':
                return { label: 'Complete Delivery', next: 'COMPLETED', icon: 'fa-camera', action: 'pod' };
            case 'DELIVERED':
                return { label: 'Complete', next: 'COMPLETED', icon: 'fa-flag-checkered', action: 'status' };
            default:
                return null;
        }
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
            {/* Available Deals */}
            {mode === 'available' && (
                <div className="space-y-4">
                    <h2 className="text-xl font-black text-gray-900">Available Deals</h2>

                    {availableDeals.length === 0 ? (
                        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="fas fa-truck text-3xl text-gray-300"></i>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">No deals available</h3>
                            <p className="text-sm text-gray-500">Check back later for new delivery opportunities</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {availableDeals.map((deal) => (
                                <div key={deal.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900">
                                                {deal.order?.listing?.crop?.name || 'Delivery'}
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-1">Deal ID: #{deal.id.slice(0, 8)}</p>
                                            {deal.order?.listing?.farmer?.name && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Farmer: {deal.order.listing.farmer.name}
                                                </p>
                                            )}
                                        </div>
                                        <StatusBadge status={deal.status} type="delivery" />
                                    </div>

                                    {/* Map Preview */}
                                    <div className="mb-4">
                                        <TransporterTrackingMap deal={deal} driverLocation={currentLocation} isPreview={true} />
                                    </div>

                                    {/* Route Info */}
                                    <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="flex flex-col items-center mt-1">
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                <div className="w-0.5 h-6 bg-gray-200 my-0.5"></div>
                                                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">Pickup From</p>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {deal.pickupLocation.address}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">Deliver To</p>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {deal.dropLocation.address}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Deal Details */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-bold">Trip Distance</p>
                                            <p className="text-base font-black text-gray-900">{deal.distance} km</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-bold">To Pickup</p>
                                            <p className="text-base font-black text-blue-600">
                                                {currentLocation && deal.pickupLocation.lat && deal.pickupLocation.lng
                                                    ? `${calculateDistance(
                                                        currentLocation.lat,
                                                        currentLocation.lng,
                                                        deal.pickupLocation.lat,
                                                        deal.pickupLocation.lng
                                                    ).toFixed(1)} km`
                                                    : '--'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-bold">Earning</p>
                                            <p className="text-base font-black text-green-600">₹{deal.totalCost}</p>
                                        </div>
                                    </div>

                                    {deal.order?.quantity && (
                                        <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex justify-between items-center">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Load</p>
                                                <p className="text-sm font-bold text-gray-900">{deal.order.quantity} kg</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500 mb-1">Price/km</p>
                                                <p className="text-sm font-bold text-gray-900">₹{deal.pricePerKm}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleDeclineDeal(deal.id)}
                                            className="bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-200 active:scale-95 transition-all"
                                        >
                                            Decline
                                        </button>
                                        <button
                                            onClick={() => handleAcceptDeal(deal.id)}
                                            className="bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all"
                                        >
                                            <i className="fas fa-check mr-2"></i>
                                            Accept
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* My Active Deliveries */}
            {mode === 'active' && (
                <div className="space-y-4">
                    <h2 className="text-xl font-black text-gray-900">My Deliveries</h2>

                    {myDeals.length === 0 ? (
                        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="fas fa-box text-3xl text-gray-300"></i>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">No active deliveries</h3>
                            <p className="text-sm text-gray-500">Accept deals to start earning</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myDeals.map((deal) => {
                                const nextAction = getNextStatus(deal.status);

                                return (
                                    <div key={deal.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-black text-gray-900">
                                                    {deal.order?.listing?.crop?.name || 'Delivery'}
                                                </h3>
                                                <p className="text-xs text-gray-400 mt-1">Deal ID: #{deal.id.slice(0, 8)}</p>
                                            </div>
                                            <div className="text-right">
                                                <StatusBadge status={deal.status} type="delivery" />
                                                <p className="text-lg font-black text-green-600 mt-2">₹{deal.totalCost}</p>
                                            </div>
                                        </div>

                                        {/* Timeline */}
                                        <div className="mb-4">
                                            <DeliveryTimeline
                                                currentStatus={deal.status}
                                                role="TRANSPORTER"
                                            />
                                        </div>

                                        {/* Map Integration */}
                                        <div className="mb-6">
                                            <TransporterTrackingMap deal={deal} driverLocation={currentLocation} />
                                        </div>

                                        {/* Route Info */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="bg-gray-50 rounded-2xl p-3">
                                                <p className="text-xs text-gray-500 mb-1">From</p>
                                                <p className="text-sm font-bold text-gray-900 break-words">
                                                    {deal.pickupLocation.address}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 rounded-2xl p-3">
                                                <p className="text-xs text-gray-500 mb-1">To</p>
                                                <p className="text-sm font-bold text-gray-900 break-words">
                                                    {deal.dropLocation.address}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        {nextAction && (
                                            <button
                                                onClick={() => {
                                                    if (nextAction.action === 'otp') {
                                                        setSelectedDeal(deal);
                                                        setShowOtpModal(true);
                                                    } else if (nextAction.action === 'pod') {
                                                        setSelectedDeal(deal);
                                                        setShowPoDModal(true);
                                                    } else {
                                                        handleUpdateStatus(deal.id, nextAction.next);
                                                    }
                                                }}
                                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                                            >
                                                <i className={`fas ${nextAction.icon} mr-2`}></i>
                                                {nextAction.label}
                                            </button>
                                        )}

                                        {deal.status === 'COMPLETED' && (
                                            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 text-center">
                                                <i className="fas fa-check-circle text-green-600 text-2xl mb-2"></i>
                                                <p className="text-sm font-bold text-green-700">Delivery Completed!</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* History / Completed Deliveries */}
            {mode === 'history' && (
                <div className="space-y-4">
                    <h2 className="text-xl font-black text-gray-900">Delivery History</h2>

                    {myDeals.length === 0 ? (
                        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="fas fa-clock-rotate-left text-3xl text-gray-300"></i>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">No delivery history</h3>
                            <p className="text-sm text-gray-500">Completed deliveries will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myDeals.map((deal) => (
                                <div key={deal.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 opacity-90 grayscale-[0.3] hover:grayscale-0 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900">
                                                {deal.order?.listing?.crop?.name || 'Delivery'}
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-1">Deal ID: #{deal.id.slice(0, 8)}</p>
                                        </div>
                                        <div className="text-right">
                                            <StatusBadge status={deal.status} type="delivery" />
                                            <p className="text-lg font-black text-emerald-600 mt-2">₹{deal.totalCost}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-gray-50 rounded-2xl p-3">
                                            <p className="text-xs text-gray-500 mb-1">From</p>
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                {deal.pickupLocation.address}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 rounded-2xl p-3">
                                            <p className="text-xs text-gray-500 mb-1">To</p>
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                {deal.dropLocation.address}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-gray-400 px-1 mt-2">
                                        <span>Distance: {deal.distance} km</span>
                                        <button
                                            onClick={() => onViewEarningDetails?.(deal)}
                                            className="text-blue-600 hover:text-blue-700 underline"
                                        >
                                            View Earning Details
                                        </button>
                                        <span>Completed on: {deal.updatedAt ? new Date(deal.updatedAt).toLocaleDateString() : 'Recently'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* OTP Entry Modal */}
            <OTPModal
                isOpen={showOtpModal}
                onClose={() => {
                    setShowOtpModal(false);
                    setSelectedDeal(null);
                }}
                mode="entry"
                onVerify={handleVerifyOtp}
                title={selectedDeal?.status === 'IN_TRANSIT' ? "Enter Delivery OTP" : "Enter Pickup OTP"}
            />
            {showPoDModal && (
                <ProofOfDeliveryModal
                    isOpen={showPoDModal}
                    onClose={() => setShowPoDModal(false)}
                    onSubmit={handlePoDSubmit}
                />
            )}
        </div>
    );
};

export default TransporterDealsView;
