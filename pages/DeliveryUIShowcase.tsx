import React, { useState } from 'react';
import DeliveryVehicleSelector from '../components/DeliveryVehicleSelector';
import ModernDropdown from '../components/common/ModernDropdown';
import { VehicleType } from '../types';

/**
 * Comprehensive Demo/Showcase of Modern Delivery UI
 * Shows all features and variations
 */

const DEMO_VEHICLES: VehicleType[] = [
    {
        id: 'bike_1',
        name: 'Bike Delivery',
        icon: 'fas fa-motorcycle',
        capacity: 15,
        basePrice: 30,
        perKmPrice: 6,
        perKgPrice: 0.5,
        minPrice: 30,
        description: 'Fast delivery for small parcels',
        popular: false,
    },
    {
        id: 'auto_1',
        name: 'Tuk-Tuk Auto',
        icon: 'fas fa-cube',
        capacity: 50,
        basePrice: 50,
        perKmPrice: 8,
        perKgPrice: 1,
        minPrice: 50,
        description: 'Budget-friendly for medium loads',
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
        description: 'Best for large agricultural loads',
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
        description: 'Heavy-duty transport',
        popular: false,
    },
    {
        id: 'tempo_1',
        name: 'Tempo/Van',
        icon: 'fas fa-van-shuttle',
        capacity: 300,
        basePrice: 120,
        perKmPrice: 12,
        perKgPrice: 1.5,
        minPrice: 120,
        description: 'Commercial cargo transport',
        popular: false,
    },
];

const DEMO_LOCATIONS = {
    farmMarkets: [
        {
            latitude: 16.5062,
            longitude: 80.6480,
            address: 'Vijayawada Farmer Market',
            district: 'Krishna',
            state: 'Andhra Pradesh',
        },
        {
            latitude: 17.3850,
            longitude: 78.4867,
            address: 'Hyderabad Agricultural Hub',
            district: 'Hyderabad',
            state: 'Telangana',
        },
        {
            latitude: 13.1939,
            longitude: 79.1941,
            address: 'Nellore Vegetable Market',
            district: 'Nellore',
            state: 'Andhra Pradesh',
        },
    ],
    cities: [
        {
            latitude: 16.3067,
            longitude: 80.4365,
            address: 'Guntur Main Market',
            district: 'Guntur',
            state: 'Andhra Pradesh',
        },
        {
            latitude: 17.3850,
            longitude: 78.4867,
            address: 'Hyderabad Central Hub',
            district: 'Hyderabad',
            state: 'Telangana',
        },
        {
            latitude: 13.1939,
            longitude: 79.1941,
            address: 'Chennai Market District',
            district: 'Chennai',
            state: 'Tamil Nadu',
        },
    ],
};

interface DemoConfig {
    numVehicles: number;
    distance: number;
    weight: number;
    pickupIndex: number;
    dropIndex: number;
}

const DeliveryUIShowcase: React.FC = () => {
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
    const [distance, setDistance] = useState(42.5);
    const [config, setConfig] = useState<DemoConfig>({
        numVehicles: 5,
        distance: 42.5,
        weight: 250,
        pickupIndex: 0,
        dropIndex: 0,
    });

    const currentPickup = DEMO_LOCATIONS.farmMarkets[config.pickupIndex];
    const currentDrop = DEMO_LOCATIONS.cities[config.dropIndex];
    const visibleVehicles = DEMO_VEHICLES.slice(0, config.numVehicles);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <h1 className="text-3xl font-black text-white mb-4">
                        🎨 Modern Delivery UI Showcase
                    </h1>
                    <p className="text-slate-400 mb-4">
                        Interactive demonstration of the iOS 26 liquid glass delivery interface
                    </p>

                    {/* Configuration Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/10 border border-white/20 rounded-2xl p-4">
                        {/* Number of Vehicles */}
                        <div>
                            <label className="text-sm font-bold text-slate-300 block mb-2">
                                Number of Vehicles: {config.numVehicles}
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="5"
                                value={config.numVehicles}
                                onChange={(e) =>
                                    setConfig(prev => ({
                                        ...prev,
                                        numVehicles: parseInt(e.target.value),
                                    }))
                                }
                                className="w-full"
                            />
                        </div>

                        {/* Distance */}
                        <div>
                            <label className="text-sm font-bold text-slate-300 block mb-2">
                                Distance: {config.distance} km
                            </label>
                            <input
                                type="range"
                                min="5"
                                max="500"
                                step="5"
                                value={config.distance}
                                onChange={(e) => {
                                    const newDistance = parseInt(e.target.value);
                                    setConfig(prev => ({
                                        ...prev,
                                        distance: newDistance,
                                    }));
                                    setDistance(newDistance);
                                }}
                                className="w-full"
                            />
                        </div>

                        {/* Weight */}
                        <div>
                            <label className="text-sm font-bold text-slate-300 block mb-2">
                                Weight: {config.weight} kg
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="1000"
                                step="10"
                                value={config.weight}
                                onChange={(e) =>
                                    setConfig(prev => ({
                                        ...prev,
                                        weight: parseInt(e.target.value),
                                    }))
                                }
                                className="w-full"
                            />
                        </div>

                        {/* Location Preset */}
                        <div>
                            <label className="text-sm font-bold text-slate-300 block mb-2">
                                Location Pair
                            </label>
                            <ModernDropdown
                                value={config.pickupIndex.toString()}
                                options={DEMO_LOCATIONS.farmMarkets.map((loc, idx) => ({
                                    value: idx.toString(),
                                    label: `${loc.district} Route`
                                }))}
                                onChange={(value) =>
                                    setConfig(prev => ({
                                        ...prev,
                                        pickupIndex: parseInt(value),
                                        dropIndex: parseInt(value),
                                    }))
                                }
                                placeholder="Select Route"
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="mt-4 p-3 bg-blue-500/20 border border-blue-400/40 rounded-lg text-blue-200 text-sm">
                        💡 <strong>Tip:</strong> Adjust the sliders and options above to see how the UI responds to different scenarios. Select a vehicle from the main display below to see the summary section.
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="pt-6 pb-20">
                <DeliveryVehicleSelector
                    vehicles={visibleVehicles}
                    selectedVehicle={selectedVehicle}
                    onVehicleSelect={setSelectedVehicle}
                    pickupLocation={currentPickup}
                    dropLocation={currentDrop}
                    distanceKm={distance}
                    totalKg={config.weight}
                    onDistanceCalculated={setDistance}
                />
            </div>

            {/* Features Showcase Panel */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/95 backdrop-blur-xl border-t border-white/10 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: '🎨', label: 'Glass Morphism', desc: 'Modern frosted glass effects' },
                            { icon: '📱', label: 'Responsive', desc: 'Mobile, tablet, desktop optimized' },
                            { icon: '🚗', label: '5+ Vehicles', desc: 'Auto-pricing & capacity checks' },
                            { icon: '📍', label: 'Auto Distance', desc: 'GPS-based calculation' },
                        ].map((feature, idx) => (
                            <div
                                key={idx}
                                className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-3 text-center hover:bg-white/15 transition-all"
                            >
                                <div className="text-2xl mb-1">{feature.icon}</div>
                                <p className="text-xs font-bold text-white mb-1">{feature.label}</p>
                                <p className="text-xs text-slate-400">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Tests Panel */}
            <div className="fixed left-4 top-32 z-40 space-y-2 hidden lg:block">
                <div className="text-xs font-bold text-slate-400 uppercase">Quick Tests</div>
                {[
                    { name: 'Light Load', weight: 50 },
                    { name: 'Medium Load', weight: 250 },
                    { name: 'Heavy Load', weight: 800 },
                    { name: 'Overload', weight: 1500 },
                ].map((test, idx) => (
                    <button
                        key={idx}
                        onClick={() =>
                            setConfig(prev => ({ ...prev, weight: test.weight }))
                        }
                        className={`block text-xs font-semibold px-3 py-1 rounded-lg transition-all w-32 ${config.weight === test.weight
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/10 text-slate-300 hover:bg-white/20'
                            }`}
                    >
                        {test.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default DeliveryUIShowcase;
