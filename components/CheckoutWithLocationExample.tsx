import React, { useState } from 'react';
import LocationPermissionModal from './LocationPermissionModal';
import DeliveryLocationForm from './DeliveryLocationForm';
import DistanceDisplay from './DistanceDisplay';
import { locationAPI } from '../services/api';

/**
 * Example: How to integrate location components into checkout flow
 * 
 * This is a reference implementation showing how to use:
 * - LocationPermissionModal
 * - DeliveryLocationForm
 * - DistanceDisplay
 * - locationAPI
 */

interface Location {
    latitude: number | null;
    longitude: number | null;
    address: string;
    district: string;
    state: string;
    source: 'GPS' | 'MANUAL' | null;
}

const CheckoutWithLocationExample: React.FC = () => {
    // Modal state
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [showLocationForm, setShowLocationForm] = useState(false);

    // Location state
    const [deliveryLocation, setDeliveryLocation] = useState<Location>({
        latitude: null,
        longitude: null,
        address: '',
        district: '',
        state: '',
        source: null
    });

    // Distance state
    const [distance, setDistance] = useState<{
        distanceKm: number | null;
        durationMinutes: number | null;
        source: 'ORS' | 'HAVERSINE' | null;
    }>({
        distanceKm: null,
        durationMinutes: null,
        source: null
    });

    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
    const [distanceError, setDistanceError] = useState<string | null>(null);

    // Farmer's location (from listing)
    const farmerLocation = {
        lat: 16.5062, // Example: Guntur, Andhra Pradesh
        lng: 80.6480
    };

    // Handle permission modal actions
    const handleAllowGPS = () => {
        setShowPermissionModal(false);
        setShowLocationForm(true);
        // The DeliveryLocationForm will handle GPS fetching
    };

    const handleManualEntry = () => {
        setShowPermissionModal(false);
        setShowLocationForm(true);
    };

    // Handle location changes
    const handleLocationChange = async (location: Location) => {
        setDeliveryLocation(location);

        // Auto-calculate distance when we have valid coordinates
        if (location.latitude && location.longitude) {
            await calculateDistance(location.latitude, location.longitude);
        }
    };

    // Calculate distance
    const calculateDistance = async (lat: number, lng: number) => {
        setIsCalculatingDistance(true);
        setDistanceError(null);

        try {
            const response = await locationAPI.calculateDistance(
                farmerLocation,
                { lat, lng }
            );

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
    };

    // Recalculate distance
    const handleRecalculate = () => {
        if (deliveryLocation.latitude && deliveryLocation.longitude) {
            calculateDistance(deliveryLocation.latitude, deliveryLocation.longitude);
        }
    };

    // Handle checkout
    const handleCheckout = async () => {
        // Validate location
        if (!deliveryLocation.address || !deliveryLocation.district || !deliveryLocation.state) {
            alert('Please provide complete delivery address');
            return;
        }

        // Save location to user profile (optional)
        if (deliveryLocation.latitude && deliveryLocation.longitude) {
            try {
                await locationAPI.updateProfile({
                    latitude: deliveryLocation.latitude,
                    longitude: deliveryLocation.longitude,
                    locationSource: deliveryLocation.source || 'MANUAL',
                    address: deliveryLocation.address
                });
            } catch (error) {
                console.error('Failed to update profile:', error);
            }
        }

        // Proceed with order creation including location and distance
        const orderData = {
            // ... other order fields
            deliveryLatitude: deliveryLocation.latitude,
            deliveryLongitude: deliveryLocation.longitude,
            deliveryAddress: deliveryLocation.address,
            distanceKm: distance.distanceKm,
            estimatedDuration: distance.durationMinutes
        };

        console.log('Creating order with location data:', orderData);
        // Call your order API here
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-black text-gray-900 mb-6">Checkout</h1>

            {/* Step 1: Location Permission Modal */}
            <LocationPermissionModal
                isOpen={showPermissionModal}
                onClose={() => setShowPermissionModal(false)}
                onAllowGPS={handleAllowGPS}
                onManualEntry={handleManualEntry}
            />

            {/* Step 2: Delivery Location Form */}
            {!showLocationForm && (
                <button
                    onClick={() => setShowPermissionModal(true)}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
                >
                    <i className="fas fa-location-dot mr-2"></i>
                    Set Delivery Location
                </button>
            )}

            {showLocationForm && (
                <div className="space-y-6">
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                        <h2 className="text-xl font-black text-gray-900 mb-4">Delivery Location</h2>
                        <DeliveryLocationForm
                            onLocationChange={handleLocationChange}
                            initialLocation={deliveryLocation}
                        />
                    </div>

                    {/* Step 3: Distance Display */}
                    <DistanceDisplay
                        distanceKm={distance.distanceKm}
                        durationMinutes={distance.durationMinutes}
                        isLoading={isCalculatingDistance}
                        error={distanceError}
                        source={distance.source}
                        onRecalculate={handleRecalculate}
                    />

                    {/* Checkout Button */}
                    <button
                        onClick={handleCheckout}
                        disabled={!deliveryLocation.address || isCalculatingDistance}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <i className="fas fa-check-circle mr-2"></i>
                        Complete Order
                    </button>
                </div>
            )}
        </div>
    );
};

export default CheckoutWithLocationExample;
