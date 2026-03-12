import React, { useState, useEffect } from 'react';
import DeliveryVehicleSelector from '../components/DeliveryVehicleSelector';
import { VehicleType } from '../types';

// Sample vehicle data
const SAMPLE_VEHICLES: VehicleType[] = [
    {
        id: 'auto_1',
        name: 'Auto Rickshaw',
        icon: 'fas fa-cube',
        capacity: 50,
        basePrice: 50,
        perKmPrice: 8,
        perKgPrice: 1,
        minPrice: 50,
        popular: false,
    },
    {
        id: 'bike_1',
        name: 'Bike',
        icon: 'fas fa-motorcycle',
        capacity: 15,
        basePrice: 30,
        perKmPrice: 6,
        perKgPrice: 0.5,
        minPrice: 30,
        popular: false,
    },
    {
        id: 'pickup_1',
        name: 'Pickup Truck',
        icon: 'fas fa-truck-pickup',
        capacity: 500,
        basePrice: 150,
        perKmPrice: 15,
        perKgPrice: 2,
        minPrice: 150,
        popular: true,
    },
    {
        id: 'truck_1',
        name: '4-Wheeler Truck',
        icon: 'fas fa-truck',
        capacity: 1000,
        basePrice: 250,
        perKmPrice: 20,
        perKgPrice: 2.5,
        minPrice: 250,
        popular: false,
    },
    {
        id: 'tempo_1',
        name: 'Tempo',
        icon: 'fas fa-van-shuttle',
        capacity: 300,
        basePrice: 120,
        perKmPrice: 12,
        perKgPrice: 1.5,
        minPrice: 120,
        popular: false,
    },
];

const ArrangeDeliveryModern: React.FC = () => {
    const [pickupLocation, setPickupLocation] = useState({
        latitude: 16.5062,
        longitude: 80.6480,
        address: 'Farmer Market, Vijayawada',
        district: 'Krishna',
        state: 'Andhra Pradesh',
    });

    const [dropLocation, setDropLocation] = useState({
        latitude: 16.3067,
        longitude: 80.4365,
        address: 'Central Market, Guntur',
        district: 'Guntur',
        state: 'Andhra Pradesh',
    });

    const [totalKg, setTotalKg] = useState(100);
    const [distance, setDistance] = useState(42.5);
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);

    // Simulate location updates
    const handleLocationChange = () => {
        // In real app, this would come from location picker
        setPickupLocation({
            latitude: 16.5062,
            longitude: 80.6480,
            address: 'Updated Pickup Location',
            district: 'Krishna',
            state: 'Andhra Pradesh',
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Import Glass Morphism Styles */}
            <style>{`
                @import url('./styles/glass-morphism.css');
            `}</style>

            {/* Optional: Navigation Bar */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center text-white font-black">
                            KS
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white">KisanSetu</h1>
                            <p className="text-xs text-slate-400">Delivery Management</p>
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-semibold transition-all">
                        Help
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <div className="min-h-[calc(100vh-80px)] pt-6 md:pt-12 pb-20">
                <DeliveryVehicleSelector
                    vehicles={SAMPLE_VEHICLES}
                    selectedVehicle={selectedVehicle}
                    onVehicleSelect={(v) => setSelectedVehicle(v)}
                    pickupLocation={pickupLocation}
                    dropLocation={dropLocation}
                    distanceKm={distance}
                    totalKg={totalKg}
                    onDistanceCalculated={setDistance}
                />
            </div>

            {/* Bottom Action Button */}
            {selectedVehicle && (
                <div className="fixed bottom-6 left-6 right-6 md:bottom-12 md:left-12 md:right-12 z-40">
                    <button className="w-full text-center py-4 px-6 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 hover:from-green-500 hover:via-emerald-600 hover:to-teal-700 text-white font-black text-lg rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95">
                        <div className="flex items-center justify-center gap-3">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                            </svg>
                            Confirm & Proceed to Checkout
                        </div>
                    </button>
                </div>
            )}

            {/* Info Bottom Sheet (Mobile) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-8 pb-6 px-4">
                <div className="max-w-sm mx-auto">
                    <div className="h-1 w-12 bg-white/30 rounded-full mx-auto mb-4"></div>
                    <p className="text-center text-slate-400 text-sm font-semibold">
                        Selected vehicle: <span className="text-white">{selectedVehicle?.name || 'None'}</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ArrangeDeliveryModern;
