import React, { useState, useEffect } from 'react';
import { Cart, CartItem } from '../types';
import { cartAPI, locationAPI } from '../services/api';
import StatusBadge from './StatusBadge';
import LocationPermissionModal from './LocationPermissionModal';
import DeliveryLocationForm from './DeliveryLocationForm';
import DistanceDisplay from './DistanceDisplay';
import PaymentSuccessAnimation from './PaymentSuccessAnimation'; // Import Animation

import { useToast } from '../context/ToastContext';
interface CartViewProps {
    onCheckoutComplete?: () => void;
    initialCheckout?: boolean;
    onResetAutoCheckout?: () => void;
    onRemoveFromWishlist?: (listingId: string) => void;
}

const CartView: React.FC<CartViewProps> = ({
    onCheckoutComplete,
    initialCheckout = false,
    onResetAutoCheckout,
    onRemoveFromWishlist
}) => {
    const { success, error, info } = useToast();
    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [clearingCart, setClearingCart] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [deliveryOption, setDeliveryOption] = useState<'FARMER_ARRANGED' | 'BUYER_ARRANGED'>('FARMER_ARRANGED');
    const [buyerDeliveryMode, setBuyerDeliveryMode] = useState<'SELF_PICKUP' | 'ARRANGE_DELIVERY' | null>(null);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

    // Location states
    const [showLocationPermissionModal, setShowLocationPermissionModal] = useState(false);
    const [showLocationForm, setShowLocationForm] = useState(false);
    const [deliveryLocation, setDeliveryLocation] = useState<{
        latitude: number | null;
        longitude: number | null;
        address: string;
        district: string;
        mandal: string;
        state: string;
        pincode: string;
        source: 'GPS' | 'MANUAL' | null;
    }>({ latitude: null, longitude: null, address: '', district: '', mandal: '', state: '', pincode: '', source: null });

    // Distance states
    const [distance, setDistance] = useState<{
        distanceKm: number | null;
        durationMinutes: number | null;
        source: 'ORS' | 'HAVERSINE' | null;
    }>({ distanceKm: null, durationMinutes: null, source: null });
    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
    const [distanceError, setDistanceError] = useState<string | null>(null);

    useEffect(() => {
        loadCart();
    }, []);

    // Calculate distance when cart loads and items are available
    useEffect(() => {
        if (cart?.items?.length > 0 && deliveryLocation?.latitude && deliveryLocation?.longitude) {
            const farmerLocation = cart.items[0].listing?.farmer?.location;
            if (farmerLocation) {
                handleLocationChange(deliveryLocation);
            }
        }
    }, [cart?.items, deliveryLocation?.latitude, deliveryLocation?.longitude]);

    useEffect(() => {
        if (initialCheckout && cart && cart.items.length > 0) {
            setShowCheckoutModal(true);
            if (onResetAutoCheckout) onResetAutoCheckout();
        }
    }, [initialCheckout, cart]);

    const loadCart = async () => {
        try {
            setLoading(true);
            const response = await cartAPI.get();
            setCart(response.cart);
        } catch (error) {
            console.error('Failed to load cart:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
        if (newQuantity < 1) return;

        try {
            await cartAPI.update(itemId, newQuantity);
            await loadCart();
        } catch (err: any) {
            error(err.message || 'Failed to update quantity');
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!confirm('Remove this item from cart?')) return;

        try {
            const itemToRemove = cart?.items.find(item => item.id === itemId);
            const listingId = itemToRemove?.listingId;

            await cartAPI.remove(itemId);
            await loadCart();

            if (listingId && onRemoveFromWishlist) {
                onRemoveFromWishlist(listingId);
            }

            success('Item removed from cart');
        } catch (err: any) {
            error(err.message || 'Failed to remove item');
        }
    };

    const handleClearCart = async () => {
        setClearingCart(true);
        try {
            // Remove all items one by one
            if (cart?.items) {
                await Promise.all(cart.items.map(item => cartAPI.remove(item.id)));
            }
            await loadCart();
            setShowClearConfirm(false);
            success('Cart cleared');
        } catch (err: any) {
            error(err.message || 'Failed to clear cart');
        } finally {
            setClearingCart(false);
        }
    };

    // ... handleRemoveItem implementation

    // Handle location permission modal
    const handleAllowGPS = () => {
        setShowLocationPermissionModal(false);
        setShowLocationForm(true);
    };

    const handleManualEntry = () => {
        setShowLocationPermissionModal(false);
        setShowLocationForm(true);
    };

    // Calculate distance
    const calculateDistance = React.useCallback(async (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => {
        setIsCalculatingDistance(true);
        setDistanceError(null);

        try {
            const response = await locationAPI.calculateDistance(origin, destination);

            if (response.success) {
                setDistance({
                    distanceKm: response.data.distanceKm,
                    durationMinutes: response.data.durationMinutes,
                    source: response.data.source
                });
            } else {
                setDistanceError('Failed to calculate distance');
            }
        } catch (error: any) {
            console.error('Distance calculation error:', error);
            setDistanceError(error.message || 'Failed to calculate distance');
        } finally {
            setIsCalculatingDistance(false);
        }
    }, []);

    // Geocode farmer address to get coordinates
    const geocodeFarmerAddress = React.useCallback(async (address: string) => {
        try {
            // Use Nominatim API via backend proxy
            const response = await locationAPI.geocode(address);
            const data = response.data;

            if (data && data.length > 0) {
                const result = data[0];
                return {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon)
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }, []);

    // Handle location changes
    const handleLocationChange = React.useCallback(async (location: typeof deliveryLocation) => {
        setDeliveryLocation(location);
        setDistance({ distanceKm: null, durationMinutes: null, source: null });
        setDistanceError(null);

        // Calculate distance automatically if we have both pickup and delivery coordinates
        if (location.latitude && location.longitude && cart?.items?.[0]?.listing?.farmer?.location) {
            const farmerLocation = cart.items[0].listing.farmer.location;

            console.log('Farmer location:', farmerLocation);

            try {
                // First try to extract coordinates if they exist in the string
                const coordMatch = farmerLocation.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
                let pickupCoords = null;

                if (coordMatch) {
                    pickupCoords = {
                        lat: parseFloat(coordMatch[1]),
                        lng: parseFloat(coordMatch[2])
                    };
                } else {
                    // If no coordinates in string, try to geocode the address
                    setIsCalculatingDistance(true);
                    setDistanceError('Geocoding farmer address...');

                    pickupCoords = await geocodeFarmerAddress(farmerLocation);

                    if (!pickupCoords) {
                        setDistanceError('Unable to find farmer location coordinates. Please check the farm address.');
                        setIsCalculatingDistance(false);
                        return;
                    }
                }

                if (pickupCoords && !isNaN(pickupCoords.lat) && !isNaN(pickupCoords.lng)) {
                    await calculateDistance(pickupCoords, {
                        lat: location.latitude,
                        lng: location.longitude
                    });
                } else {
                    setDistanceError('Invalid farmer coordinates found.');
                }
            } catch (error) {
                console.error('Error calculating distance:', error);
                setDistanceError('Distance calculation failed. Please try again.');
                setIsCalculatingDistance(false);
            }
        }
    }, [cart, calculateDistance, geocodeFarmerAddress]);

    // Recalculate distance
    const handleRecalculateDistance = () => {
        setDistanceError('Distance will be calculated automatically after farm coordinates are available.');
    };

    const handleCheckout = async () => {
        setCheckoutLoading(true);

        // Validate location
        if (!deliveryLocation.address || !deliveryLocation.district || !deliveryLocation.state) {
            error('Please provide your delivery location before checkout');
            setShowLocationPermissionModal(true);
            setCheckoutLoading(false);
            return;
        }

        // Save location to profile if coordinates available
        if (deliveryLocation.latitude && deliveryLocation.longitude) {
            try {
                // Construct full address for profile
                const fullAddress = [
                    deliveryLocation.address,
                    deliveryLocation.mandal,
                    deliveryLocation.district,
                    deliveryLocation.state,
                    deliveryLocation.pincode
                ].filter(part => part && part.length > 0).join(', ');

                await locationAPI.updateProfile({
                    latitude: deliveryLocation.latitude,
                    longitude: deliveryLocation.longitude,
                    locationSource: deliveryLocation.source || 'MANUAL',
                    address: fullAddress
                });
            } catch (err) {
                console.error('Failed to update profile location:', err);
            }
        }

        // Trigger Animation
        setShowSuccessAnimation(true);
    };

    const calculateTotal = () => {
        if (!cart?.items) return 0;
        return cart.items.reduce((total, item) => {
            const price = (item.negotiation && item.negotiation.status === 'ACCEPTED')
                ? item.negotiation.currentOffer
                : (item.listing?.expectedPrice || 0);
            return total + price * item.quantity;
        }, 0);
    };

    const calculateFees = (items: CartItem[], option: 'FARMER_ARRANGED' | 'BUYER_ARRANGED', distanceKm: number | null = null) => {
        const subtotal = items.reduce((sum, item) => {
            const price = (item.negotiation && item.negotiation.status === 'ACCEPTED')
                ? item.negotiation.currentOffer
                : (item.listing?.expectedPrice || 0);
            return sum + price * item.quantity;
        }, 0);
        const totalKg = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

        const taxRate = 0.05;
        const taxes = subtotal * taxRate;

        const handlingFee = subtotal > 0 ? 10 : 0;

        let deliveryFee = 0;
        // FARMER_ARRANGED: delivery fee is paid later via transporter selection — not at checkout
        // BUYER_ARRANGED with SELF_PICKUP: no delivery fee
        // (Other BUYER_ARRANGED modes could have a fee in future)

        const grandTotal = subtotal + taxes + handlingFee + deliveryFee;

        return { subtotal, taxes, handlingFee, deliveryFee, grandTotal, taxRate };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-4xl text-green-600 mb-4"></i>
                    <p className="text-sm font-bold text-gray-500">Loading cart...</p>
                </div>
            </div>
        );
    }

    const items = cart?.items || [];
    const total = calculateTotal();
    const fees = calculateFees(items, deliveryOption, distance.distanceKm);

    // Derive farmer info from the first item (all items are same farmer)
    const farmerInfo = items.length > 0 ? items[0].listing?.farmer : null;

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Shopping Cart</h2>
                    <p className="text-sm text-gray-500 mt-1">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
                </div>
                <div className="flex items-center gap-3">
                    {items.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowClearConfirm(true)}
                            className="text-sm font-bold text-red-400 hover:text-red-600 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
                        >
                            <i className="fas fa-trash-alt mr-1"></i> Clear
                        </button>
                    )}
                    {items.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowCheckoutModal(true)}
                            className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg hover:bg-green-700 active:scale-95 transition-all"
                        >
                            Checkout • ₹{total.toLocaleString()}
                        </button>
                    )}
                </div>
            </div>

            {/* Clear Cart Confirmation */}
            {showClearConfirm && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between animate-slideInUp">
                    <div>
                        <p className="font-bold text-red-800">Clear entire cart?</p>
                        <p className="text-xs text-red-600 mt-0.5">All {items.length} items will be removed.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowClearConfirm(false)}
                            className="px-4 py-2 rounded-xl font-bold text-gray-600 hover:bg-red-100 text-sm transition-colors"
                        >Cancel</button>
                        <button
                            type="button"
                            onClick={handleClearCart}
                            disabled={clearingCart}
                            className="px-4 py-2 rounded-xl font-bold bg-red-600 text-white text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                        >{clearingCart ? 'Clearing...' : 'Yes, Clear'}</button>
                    </div>
                </div>
            )}

            {/* Cart Items */}
            {items.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-shopping-cart text-3xl text-gray-300"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Your cart is empty</h3>
                    <p className="text-sm text-gray-500">Browse listings and add items to get started</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Farmer Banner */}
                    {farmerInfo && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl px-5 py-4 flex items-center gap-4 animate-slideInUp">
                            <div className="w-12 h-12 rounded-2xl bg-green-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                <i className="fas fa-tractor text-white text-lg"></i>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-black uppercase tracking-widest text-green-600 mb-0.5">Selling Farmer</p>
                                <p className="text-base font-black text-gray-900">{farmerInfo.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5"><i className="fas fa-map-marker-alt mr-1"></i>{farmerInfo.location}</p>
                            </div>
                            <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
                                {items.length} crop{items.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    )}

                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            className={`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 animate-slideInUp anim-delay-${Math.min(index * 100, 1500)}`}
                        >
                            <div className="flex gap-6">
                                {/* Image */}
                                {item.listing?.images && item.listing.images[0] && (
                                    <div className="relative group overflow-hidden rounded-2xl w-24 h-24 flex-shrink-0">
                                        <img
                                            src={item.listing.images[0]}
                                            alt={item.listing.crop?.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    </div>
                                )}

                                {/* Details */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900">
                                                {item.listing?.crop?.name || 'Crop'}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {item.listing?.location} • Grade {item.listing?.grade}
                                            </p>
                                        </div>
                                        {/* Remove Button */}
                                        <button
                                            type="button"
                                            title="Remove item"
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                                disabled={item.quantity <= 1}
                                                className="w-8 h-8 rounded-lg bg-white shadow-sm hover:bg-gray-50 text-gray-900 transition-colors flex items-center justify-center disabled:opacity-30"
                                                aria-label="Decrease quantity"
                                                title="Decrease quantity"
                                            >
                                                <i className="fas fa-minus text-xs"></i>
                                            </button>
                                            <div className="text-center min-w-[50px]">
                                                <p className="text-sm font-black text-gray-900">{item.quantity} kg</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                                className="w-8 h-8 rounded-lg bg-green-500 shadow-md hover:bg-green-600 text-white transition-colors flex items-center justify-center"
                                                aria-label="Increase quantity"
                                                title="Increase quantity"
                                            >
                                                <i className="fas fa-plus text-xs"></i>
                                            </button>
                                        </div>

                                        {/* Price */}
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-gray-900">
                                                ₹{(((item.negotiation && item.negotiation.status === 'ACCEPTED') ? item.negotiation.currentOffer : (item.listing?.expectedPrice || 0)) * item.quantity).toLocaleString()}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                ₹{(item.negotiation && item.negotiation.status === 'ACCEPTED') ? item.negotiation.currentOffer : item.listing?.expectedPrice}/kg
                                                {(item.negotiation && item.negotiation.status === 'ACCEPTED') && (
                                                    <span className="ml-1 text-green-600 font-bold">(Negotiated)</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Locked indicator */}
                                    {item.lockedAt && (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg w-fit">
                                            <i className="fas fa-lock"></i>
                                            <span className="font-bold">Price locked for 15m</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Checkout Modal (Full Screen Overlay) */}
            {showCheckoutModal && (
                <div className="fixed inset-0 z-[70] bg-gray-50 animate-fadeIn">
                    {/* Full Screen Container */}
                    <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">

                        {/* Left Side: Delivery Details & Actions */}
                        <div className="flex-1 flex flex-col md:h-full overflow-hidden bg-white md:shadow-xl relative z-10">
                            {/* Header */}
                            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                                <h2 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-100 flex items-center justify-center">
                                        <i className="fas fa-shopping-bag text-green-600 text-lg md:text-xl"></i>
                                    </div>
                                    Checkout
                                </h2>
                                <button
                                    type="button"
                                    title="Close Checkout"
                                    onClick={() => setShowCheckoutModal(false)}
                                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-32 md:pb-12 custom-scrollbar">
                                <div className="max-w-3xl mx-auto space-y-10">
                                    {/* Pickup Location Section - ADDED NEW */}
                                    <section className="animate-slideInUp anim-delay-50">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm border-2 border-orange-200">
                                                    <i className="fas fa-warehouse"></i>
                                                </span>
                                                Pickup From (Farmer)
                                            </h3>
                                        </div>

                                        <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 flex items-start gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm text-orange-600 border border-orange-100">
                                                <i className="fas fa-tractor text-xl"></i>
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 text-base mb-0.5">
                                                    {farmerInfo?.name || 'Farmer'}
                                                </p>
                                                <p className="font-bold text-gray-600 text-sm mb-1">
                                                    {farmerInfo?.location || 'Processing Location...'}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-orange-700 font-bold">
                                                    <span className="px-2 py-0.5 bg-orange-100 rounded-md">Source</span>
                                                    <span>•</span>
                                                    <span>{items.length} crop{items.length > 1 ? 's' : ''} from this farmer</span>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Divider with Arrow */}
                                    <div className="flex justify-center -my-3 relative z-10">
                                        <div className="bg-white p-2 rounded-full border border-gray-100 shadow-sm text-gray-300">
                                            <i className="fas fa-arrow-down"></i>
                                        </div>
                                    </div>

                                    {/* Delivery Location Section */}
                                    <section className="animate-slideInUp anim-delay-100">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm">1</span>
                                                Delivery Location
                                            </h3>
                                        </div>

                                        {!showLocationForm && !deliveryLocation.address ? (
                                            <button
                                                type="button"
                                                title="Set Delivery Address"
                                                onClick={() => setShowLocationForm(true)}
                                                className="w-full py-8 border-2 border-dashed border-green-300 rounded-3xl text-green-600 font-bold hover:bg-green-50 transition-all flex flex-col items-center justify-center gap-3 group"
                                            >
                                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <i className="fas fa-plus text-2xl"></i>
                                                </div>
                                                <span className="text-lg">Set Delivery Address</span>
                                            </button>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                                                    <DeliveryLocationForm
                                                        onLocationChange={handleLocationChange}
                                                        initialLocation={deliveryLocation}
                                                        showGPSButton={true}
                                                    />
                                                </div>

                                                <DistanceDisplay
                                                    distanceKm={distance.distanceKm}
                                                    durationMinutes={distance.durationMinutes}
                                                    isLoading={isCalculatingDistance}
                                                    error={distanceError}
                                                    source={distance.source}
                                                    onRecalculate={handleRecalculateDistance}
                                                />
                                            </div>
                                        )}
                                    </section>

                                    {/* Divider */}
                                    <div className="h-px bg-gray-100"></div>

                                    {/* Delivery Option Section */}
                                    <section className="animate-slideInUp anim-delay-200">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm">2</span>
                                                Delivery Arrangement
                                            </h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <button
                                                type="button"
                                                title="Choose Farmer Arranged Delivery"
                                                onClick={() => { setDeliveryOption('FARMER_ARRANGED'); setBuyerDeliveryMode(null); }}
                                                className={`p-6 rounded-3xl border-2 transition-all text-left relative overflow-hidden group ${deliveryOption === 'FARMER_ARRANGED'
                                                    ? 'border-green-500 bg-green-50/50 shadow-md transform scale-[1.02]'
                                                    : 'border-gray-100 hover:border-gray-200 bg-white hover:shadow-lg'
                                                    }`}
                                            >
                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600 mb-2">
                                                            <i className="fas fa-truck text-xl"></i>
                                                        </div>
                                                        {deliveryOption === 'FARMER_ARRANGED' && <i className="fas fa-check-circle text-green-500 text-2xl"></i>}
                                                    </div>
                                                    <span className={`block font-black text-lg mb-1 ${deliveryOption === 'FARMER_ARRANGED' ? 'text-green-800' : 'text-gray-900'}`}>Farmer Arranged</span>
                                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Farmer handles logistics. Fees verified based on distance.</p>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                title="Choose Buyer Arranged Delivery"
                                                onClick={() => setDeliveryOption('BUYER_ARRANGED')}
                                                className={`p-6 rounded-3xl border-2 transition-all text-left relative overflow-hidden group ${deliveryOption === 'BUYER_ARRANGED'
                                                    ? 'border-green-500 bg-green-50/50 shadow-md transform scale-[1.02]'
                                                    : 'border-gray-100 hover:border-gray-200 bg-white hover:shadow-lg'
                                                    }`}
                                            >
                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mb-2">
                                                            <i className="fas fa-user-check text-xl"></i>
                                                        </div>
                                                        {deliveryOption === 'BUYER_ARRANGED' && <i className="fas fa-check-circle text-green-500 text-2xl"></i>}
                                                    </div>
                                                    <span className={`block font-black text-lg mb-1 ${deliveryOption === 'BUYER_ARRANGED' ? 'text-green-800' : 'text-gray-900'}`}>I'll Arrange</span>
                                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">You pick up or arrange your own transport.</p>
                                                </div>
                                            </button>
                                        </div>

                                        {/* Sub-options when I'll Arrange is selected */}
                                        {deliveryOption === 'BUYER_ARRANGED' && (
                                            <div className="mt-6 animate-slideInUp">
                                                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">How will you get your order?</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Self Pickup Card */}
                                                    <button
                                                        type="button"
                                                        title="Self Pickup"
                                                        onClick={() => setBuyerDeliveryMode('SELF_PICKUP')}
                                                        className={`p-5 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${buyerDeliveryMode === 'SELF_PICKUP'
                                                            ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 shadow-md transform scale-[1.02]'
                                                            : 'border-gray-100 hover:border-emerald-200 bg-white hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="relative z-10">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                                    <i className="fas fa-person-walking text-lg"></i>
                                                                </div>
                                                                {buyerDeliveryMode === 'SELF_PICKUP' && <i className="fas fa-check-circle text-emerald-500 text-xl"></i>}
                                                            </div>
                                                            <span className={`block font-black text-base mb-1 ${buyerDeliveryMode === 'SELF_PICKUP' ? 'text-emerald-800' : 'text-gray-900'}`}>Self Pickup</span>
                                                            <p className="text-xs text-gray-500 font-medium leading-relaxed">Pick up directly from farmer. No delivery fee.</p>
                                                            <div className="mt-2 flex items-center gap-1">
                                                                <i className="fas fa-shield-halved text-emerald-500 text-xs"></i>
                                                                <span className="text-xs font-bold text-emerald-600">OTP Verified Handoff</span>
                                                            </div>
                                                        </div>
                                                    </button>

                                                    {/* Arrange Delivery Card */}
                                                    <button
                                                        type="button"
                                                        title="Arrange Delivery"
                                                        onClick={() => setBuyerDeliveryMode('ARRANGE_DELIVERY')}
                                                        className={`p-5 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${buyerDeliveryMode === 'ARRANGE_DELIVERY'
                                                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md transform scale-[1.02]'
                                                            : 'border-gray-100 hover:border-blue-200 bg-white hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="relative z-10">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                                                    <i className="fas fa-truck-moving text-lg"></i>
                                                                </div>
                                                                {buyerDeliveryMode === 'ARRANGE_DELIVERY' && <i className="fas fa-check-circle text-blue-500 text-xl"></i>}
                                                            </div>
                                                            <span className={`block font-black text-base mb-1 ${buyerDeliveryMode === 'ARRANGE_DELIVERY' ? 'text-blue-800' : 'text-gray-900'}`}>Arrange Delivery</span>
                                                            <p className="text-xs text-gray-500 font-medium leading-relaxed">Choose a vehicle. Fee added to your order.</p>
                                                            <div className="mt-2 flex items-center gap-1">
                                                                <i className="fas fa-truck-fast text-blue-500 text-xs"></i>
                                                                <span className="text-xs font-bold text-blue-600">Select Vehicle After Checkout</span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </section>

                                    {/* Divider */}
                                    <div className="h-px bg-gray-100"></div>

                                    {/* Payment Method Section - NEW */}
                                    <section className="animate-slideInUp anim-delay-300">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm">3</span>
                                                Payment Method
                                            </h3>
                                            <div className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                                                <i className="fas fa-shield-alt"></i> Escrow Secured
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {/* UPI */}
                                            <label className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'UPI' ? 'border-green-500 bg-green-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="UPI"
                                                    checked={paymentMethod === 'UPI'}
                                                    onChange={() => setPaymentMethod('UPI')}
                                                    className="w-5 h-5 text-green-600 focus:ring-green-500"
                                                />
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                                    <i className="fas fa-mobile-alt text-green-600"></i>
                                                </div>
                                                <div className="flex-1">
                                                    <span className="font-bold text-gray-900 block">UPI (GPay, PhonePe)</span>
                                                    <span className="text-xs text-gray-500">Fast & Secure</span>
                                                </div>
                                                {paymentMethod === 'UPI' && <i className="fas fa-check-circle text-green-600 text-xl"></i>}
                                            </label>

                                            {/* Card */}
                                            <label className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'CARD' ? 'border-green-500 bg-green-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="CARD"
                                                    checked={paymentMethod === 'CARD'}
                                                    onChange={() => setPaymentMethod('CARD')}
                                                    className="w-5 h-5 text-green-600 focus:ring-green-500"
                                                />
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                                    <i className="fas fa-credit-card text-blue-500"></i>
                                                </div>
                                                <div className="flex-1">
                                                    <span className="font-bold text-gray-900 block">Credit/Debit Card</span>
                                                    <span className="text-xs text-gray-500">Visa, Mastercard</span>
                                                </div>
                                                {paymentMethod === 'CARD' && <i className="fas fa-check-circle text-green-600 text-xl"></i>}
                                            </label>

                                            {/* NetBanking */}
                                            <label className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'NETBANKING' ? 'border-green-500 bg-green-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="NETBANKING"
                                                    checked={paymentMethod === 'NETBANKING'}
                                                    onChange={() => setPaymentMethod('NETBANKING')}
                                                    className="w-5 h-5 text-green-600 focus:ring-green-500"
                                                />
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                                    <i className="fas fa-university text-purple-500"></i>
                                                </div>
                                                <div className="flex-1">
                                                    <span className="font-bold text-gray-900 block">Net Banking</span>
                                                    <span className="text-xs text-gray-500">All Indian Banks</span>
                                                </div>
                                                {paymentMethod === 'NETBANKING' && <i className="fas fa-check-circle text-green-600 text-xl"></i>}
                                            </label>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Order Summary (Fixed Sidebar - Desktop) */}
                        <div className="hidden md:flex w-[480px] bg-gray-50 border-l border-gray-200 flex-col h-full animate-fadeIn anim-delay-200">
                            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                                <h3 className="text-xl font-black text-gray-900 mb-6">Order Summary</h3>

                                <div className="space-y-4 mb-8">
                                    {items.map(item => (
                                        <div key={item.id} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm transition-transform hover:scale-[1.02]">
                                            {item.listing?.images?.[0] && (
                                                <img src={item.listing.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 text-base truncate mb-1">{item.listing?.crop?.name}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-md text-gray-600">{item.quantity} kg</span>
                                                    <span className="text-xs font-bold px-2 py-1 bg-green-50 rounded-md text-green-700">₹{(item.negotiation && item.negotiation.status === 'ACCEPTED') ? item.negotiation.currentOffer : item.listing?.expectedPrice}/kg</span>
                                                </div>
                                            </div>
                                            <span className="font-black text-gray-900 text-lg">
                                                ₹{(((item.negotiation && item.negotiation.status === 'ACCEPTED') ? item.negotiation.currentOffer : (item.listing?.expectedPrice || 0)) * item.quantity).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-bold">Subtotal</span>
                                        <span className="font-bold text-gray-900">₹{fees.subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-bold">Taxes (5%)</span>
                                        <span className="font-bold text-gray-900">₹{fees.taxes.toFixed(2)}</span>
                                    </div>
                                    {/* Delivery Fee row */}
                                    {(deliveryOption !== 'BUYER_ARRANGED' || buyerDeliveryMode !== 'SELF_PICKUP') && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-bold">
                                                Delivery Fee
                                                {deliveryOption === 'FARMER_ARRANGED' && (
                                                    <span className="ml-1 text-xs text-blue-500 font-medium">(billed after transporter selected)</span>
                                                )}
                                            </span>
                                            <span className={`font-bold ${deliveryOption === 'FARMER_ARRANGED' ? 'text-gray-400' : 'text-green-600'}`}>
                                                {deliveryOption === 'FARMER_ARRANGED' ? '₹0' : `₹${fees.deliveryFee.toFixed(2)}`}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-bold">Handling</span>
                                        <span className="font-bold text-gray-900">₹{fees.handlingFee.toFixed(2)}</span>
                                    </div>
                                    <div className="h-px bg-gray-100 my-2"></div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-lg font-black text-gray-900">Total</span>
                                        <span className="text-3xl font-black text-green-600">₹{fees.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Action Area */}
                            <div className="p-8 bg-white border-t border-gray-100">
                                <button
                                    type="button"
                                    title="Confirm and Pay"
                                    onClick={handleCheckout}
                                    disabled={checkoutLoading}
                                    className="w-full bg-black text-white py-5 rounded-2xl font-bold text-lg shadow-xl hover:bg-gray-900 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                                >
                                    {checkoutLoading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Processing Payment...
                                        </>
                                    ) : (
                                        <>
                                            Confirm & Pay <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                        </>
                                    )}
                                </button>
                                <p className="text-xs text-center text-gray-400 mt-4 font-medium flex items-center justify-center gap-1">
                                    <i className="fas fa-lock"></i> Secure 256-bit SSL Encryption
                                </p>
                            </div>
                        </div>

                        {/* Mobile Order Summary (Bottom Sheet) */}
                        <div className="md:hidden bg-white border-t border-gray-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-30">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase">Total</p>
                                    <p className="text-2xl font-black text-green-600">₹{fees.grandTotal.toLocaleString()}</p>
                                </div>
                                <button
                                    type="button"
                                    title="View Details"
                                    onClick={() => {/* Toggle details view - to be implemented if needed */ }}
                                    className="text-sm font-bold text-gray-600 underline"
                                >
                                    View Details
                                </button>
                            </div>
                            <button
                                type="button"
                                title="Place Order"
                                onClick={handleCheckout}
                                disabled={checkoutLoading}
                                className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                            >
                                {checkoutLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Place Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <LocationPermissionModal
                isOpen={showLocationPermissionModal}
                onClose={() => setShowLocationPermissionModal(false)}
                onAllowGPS={handleAllowGPS}
                onManualEntry={handleManualEntry}
            />

            {showSuccessAnimation && (
                <PaymentSuccessAnimation
                    onComplete={async () => {
                        try {
                            // Checkout with location data and payment details
                            const fullDeliveryAddress = [
                                deliveryLocation.address,
                                deliveryLocation.mandal,
                                deliveryLocation.district,
                                deliveryLocation.state,
                                deliveryLocation.pincode
                            ].filter(part => part && part.length > 0).join(', ');

                            await cartAPI.checkout(deliveryOption, {
                                deliveryLatitude: deliveryLocation.latitude,
                                deliveryLongitude: deliveryLocation.longitude,
                                deliveryAddress: fullDeliveryAddress,
                                distanceKm: typeof distance.distanceKm === 'number' ? distance.distanceKm : undefined,
                                estimatedDuration: typeof distance.durationMinutes === 'number' ? distance.durationMinutes : undefined,
                                deliveryMode: deliveryOption === 'BUYER_ARRANGED' ? buyerDeliveryMode : undefined,
                                paymentMethod: paymentMethod, // Selected method
                                platformFee: fees.handlingFee, // Using handling fee as platform fee
                                farmerAmount: fees.subtotal, // Approximation
                                transporterAmount: fees.deliveryFee
                            });

                            setShowSuccessAnimation(false);
                            setShowCheckoutModal(false);
                            setCheckoutLoading(false);
                            success('Order placed successfully! Funds held in Escrow.');
                            await loadCart();
                            if (onCheckoutComplete) onCheckoutComplete();
                        } catch (err: any) {
                            setShowSuccessAnimation(false);
                            setCheckoutLoading(false);
                            error(err.message || 'Checkout failed');
                        }
                    }}
                />
            )}
        </div >
    );
};

export default CartView;
