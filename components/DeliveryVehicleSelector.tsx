import React, { useState, useEffect } from 'react';
import { VehicleType } from '../types';

interface Location {
    latitude: number | null;
    longitude: number | null;
    address: string;
    district: string;
    state: string;
}

interface DeliveryVehicleSelectorProps {
    vehicles: VehicleType[];
    selectedVehicle: VehicleType | null;
    onVehicleSelect: (vehicle: VehicleType, calculatedCost: number) => void;
    pickupLocation: Location;
    dropLocation: Location;
    distanceKm: number;
    totalKg: number;
    onDistanceCalculated?: (distance: number) => void;
}

// Calculate distance using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Simple hook for scroll reveal animation
const useScrollReveal = (threshold = 0.1) => {
    const [isVisible, setIsVisible] = useState(false);
    const domRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => setIsVisible(entry.isIntersecting));
        }, { threshold });

        const current = domRef.current;
        if (current) observer.observe(current);

        return () => {
            if (current) observer.unobserve(current);
        };
    }, [threshold]);

    return { domRef, isVisible };
};

const ScrollRevealCard: React.FC<{ children: React.ReactNode; delay?: string, className?: string }> = ({ children, delay = '0ms', className = '' }) => {
    const { domRef, isVisible } = useScrollReveal(0.1);

    return (
        <div
            ref={domRef}
            className={`transition-all duration-700 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${className}`}
            style={{ transitionDelay: delay }}
        >
            {children}
        </div>
    );
};

const DeliveryVehicleSelector: React.FC<DeliveryVehicleSelectorProps> = ({
    vehicles,
    selectedVehicle,
    onVehicleSelect,
    pickupLocation,
    dropLocation,
    distanceKm,
    totalKg,
    onDistanceCalculated
}) => {
    const [calculatedDistance, setCalculatedDistance] = useState(distanceKm);
    const [isLoading, setIsLoading] = useState(false);
    const [estimatedTimes, setEstimatedTimes] = useState<{ [key: string]: number }>({});
    const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

    // Calculate distance on mount or when locations change
    useEffect(() => {
        if (
            pickupLocation.latitude &&
            pickupLocation.longitude &&
            dropLocation.latitude &&
            dropLocation.longitude
        ) {
            const distance = calculateDistance(
                pickupLocation.latitude,
                pickupLocation.longitude,
                dropLocation.latitude,
                dropLocation.longitude
            );
            setCalculatedDistance(distance);
            if (onDistanceCalculated) {
                onDistanceCalculated(distance);
            }
        }
    }, [pickupLocation, dropLocation, onDistanceCalculated]);

    // Calculate estimated times for vehicles
    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            const times: { [key: string]: number } = {};
            vehicles.forEach(vehicle => {
                const baseTime = 15;
                const distanceFactor = calculatedDistance * 1.5;
                const weightFactor = totalKg > vehicle.capacity ? 20 : 0;
                times[vehicle.id] = Math.round(baseTime + distanceFactor + weightFactor);
            });
            setEstimatedTimes(times);
            setIsLoading(false);
        }, 800);

        return () => clearTimeout(timer);
    }, [vehicles, calculatedDistance, totalKg]);

    const calculateDeliveryFee = (vehicle: VehicleType) => {
        const distanceCharge = calculatedDistance * vehicle.perKmPrice;
        const weightCharge = totalKg * vehicle.perKgPrice;

        // Base price + (distance * price/km) + (weight * price/kg)
        // This ensures the fee considers both load and distance as requested
        const calculatedFee = vehicle.basePrice + distanceCharge + weightCharge;

        return Math.max(calculatedFee, vehicle.minPrice);
    };

    const isVehicleAvailable = (vehicle: VehicleType) => {
        return totalKg <= vehicle.capacity && Math.random() > 0.1;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-12 text-center animate-slide-up">
                    <h1 className="text-5xl font-black text-gray-900 mb-3 tracking-tight">
                        Arrange Delivery
                    </h1>
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-[0.2em]">Select pickup, drop-off & vehicle</p>
                </div>

                {/* Location Cards with Glass Effect */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {/* Pickup Location Card */}
                    <ScrollRevealCard delay="100ms">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative bg-white border border-gray-100 rounded-3xl p-6 hover:border-green-200 transition-all duration-300 shadow-xl shadow-gray-100/50">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shadow-sm">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Pickup Location</p>
                                        <p className="text-xl font-black text-gray-900 line-clamp-2">{pickupLocation.address}</p>
                                        <p className="text-xs text-gray-500 mt-1">{pickupLocation.district}, {pickupLocation.state}</p>
                                    </div>
                                </div>
                                {pickupLocation.latitude && (
                                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-3">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                        </svg>
                                        {pickupLocation.latitude.toFixed(4)}°, {pickupLocation.longitude.toFixed(4)}°
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollRevealCard>

                    {/* Drop Location Card */}
                    <ScrollRevealCard delay="200ms">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative bg-white border border-gray-100 rounded-3xl p-6 hover:border-orange-200 transition-all duration-300 shadow-xl shadow-gray-100/50">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Drop-off Location</p>
                                        <p className="text-xl font-black text-gray-900 line-clamp-2">{dropLocation.address}</p>
                                        <p className="text-xs text-gray-500 mt-1">{dropLocation.district}, {dropLocation.state}</p>
                                    </div>
                                </div>
                                {dropLocation.latitude && (
                                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-3">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                        </svg>
                                        {dropLocation.latitude.toFixed(4)}°, {dropLocation.longitude.toFixed(4)}°
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollRevealCard>
                </div>

                {/* Trip Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {/* Distance Card */}
                    <ScrollRevealCard delay="300ms">
                        <div className="bg-white border border-gray-100 rounded-3xl p-6 text-center hover:border-blue-200 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.02)] h-full group">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-600 group-hover:scale-110 transition-transform">
                                <i className="fas fa-route text-lg"></i>
                            </div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Distance</p>
                            <p className="text-3xl font-black text-gray-900 leading-none">{calculatedDistance.toFixed(1)}</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">km</p>
                        </div>
                    </ScrollRevealCard>

                    {/* Load/Weight Card */}
                    <ScrollRevealCard delay="400ms">
                        <div className="bg-white border border-gray-100 rounded-3xl p-6 text-center hover:border-orange-200 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.02)] h-full group">
                            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-orange-600 group-hover:scale-110 transition-transform">
                                <i className="fas fa-weight-hanging text-lg"></i>
                            </div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Load</p>
                            <p className="text-3xl font-black text-gray-900 leading-none">{totalKg || 0}</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">kg</p>
                        </div>
                    </ScrollRevealCard>

                    {/* Minimum Cost Card */}
                    <ScrollRevealCard delay="500ms">
                        <div className="bg-white border border-gray-100 rounded-3xl p-6 text-center hover:border-green-200 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.02)] h-full group">
                            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-green-600 group-hover:scale-110 transition-transform">
                                <i className="fas fa-circle-notch text-lg"></i>
                            </div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Min Cost</p>
                            <p className="text-2xl font-black text-gray-900 leading-none">₹{Math.min(...vehicles.map(v => calculateDeliveryFee(v))).toFixed(0)}</p>
                        </div>
                    </ScrollRevealCard>

                    {/* Max Cost Card */}
                    <ScrollRevealCard delay="600ms">
                        <div className="bg-white border border-gray-100 rounded-3xl p-6 text-center hover:border-purple-200 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.02)] h-full group">
                            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-purple-600 group-hover:scale-110 transition-transform">
                                <i className="fas fa-circle-notch text-lg"></i>
                            </div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Max Cost</p>
                            <p className="text-2xl font-black text-gray-900 leading-none">₹{Math.max(...vehicles.map(v => calculateDeliveryFee(v))).toFixed(0)}</p>
                        </div>
                    </ScrollRevealCard>
                </div>

                {/* Vehicle Selection Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Choose Your Vehicle</h2>
                    <p className="text-gray-500 text-sm">Select based on capacity and pricing</p>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="inline-block animate-spin mb-4">
                                <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full"></div>
                            </div>
                            <p className="text-gray-500 font-semibold">Finding available vehicles...</p>
                        </div>
                    </div>
                )}

                {/* Vehicles List */}
                {!isLoading && (
                    <div className="space-y-3 pb-8">
                        {vehicles.map((vehicle, index) => {
                            const isSelected = selectedVehicle?.id === vehicle.id;
                            const isAvailable = isVehicleAvailable(vehicle);
                            const fee = calculateDeliveryFee(vehicle);
                            const eta = estimatedTimes[vehicle.id] || 0;
                            const isOverloaded = totalKg > vehicle.capacity;
                            const isExpanded = expandedVehicle === vehicle.id;

                            return (
                                <ScrollRevealCard key={vehicle.id} delay={`${index * 100}ms`}>
                                    <div className="mb-3">
                                        <button
                                            onClick={() => {
                                                if (isAvailable) {
                                                    const fee = calculateDeliveryFee(vehicle);
                                                    onVehicleSelect(vehicle, fee);
                                                    setExpandedVehicle(isExpanded ? null : vehicle.id);
                                                }
                                            }}
                                            disabled={!isAvailable}
                                            className={`w-full group relative overflow-hidden rounded-3xl border transition-all duration-300 text-left ${isSelected
                                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-xl shadow-green-100 scale-[1.02]'
                                                : isAvailable
                                                    ? 'bg-white border-gray-100 hover:border-green-100 hover:shadow-lg shadow-sm'
                                                    : 'bg-gray-50 border-transparent opacity-60 cursor-not-allowed'
                                                }`}
                                        >
                                            {/* Vehicle Header */}
                                            <div className="p-6 flex items-center justify-between">
                                                <div className="flex items-center gap-4 flex-1">
                                                    {/* Vehicle Icon */}
                                                    <div className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all ${isSelected
                                                        ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                                                        : 'bg-gray-100 text-gray-500 group-hover:bg-green-50 group-hover:text-green-600'
                                                        }`}>
                                                        {vehicle.icon ? (
                                                            <i className={vehicle.icon}></i>
                                                        ) : (
                                                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm11 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM5 10l1.5-4.5h11L19 10H5z" />
                                                            </svg>
                                                        )}
                                                    </div>

                                                    {/* Vehicle Details */}
                                                    <div className="flex-1 text-left">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className={`text-xl font-black transition-colors ${isSelected ? 'text-gray-900' : 'text-gray-800'
                                                                }`}>
                                                                {vehicle.name}
                                                            </h3>
                                                            {vehicle.popular && (
                                                                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                                                    Popular
                                                                </span>
                                                            )}
                                                            {isOverloaded && (
                                                                <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                                                                    Too Small
                                                                </span>
                                                            )}
                                                            {!isAvailable && (
                                                                <span className="px-3 py-1 bg-gray-100 text-gray-400 text-xs font-bold rounded-full">
                                                                    Unavailable
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Quick Stats */}
                                                        <div className="flex items-center gap-4 text-sm flex-wrap">
                                                            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                                                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                                                </svg>
                                                                <span className="font-bold text-gray-600">{vehicle.capacity} kg</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                                                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M11.99 5V1h-1v4H8.98v2h3.01v3.1H8.98v2h3.01V16h1v-3.9h3.01v-2h-3.01V7h3.01V5h-3.01z" />
                                                                </svg>
                                                                <span className="font-bold text-gray-600">{eta} min</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Price Section */}
                                                <div className="text-right ml-4">
                                                    <div className={`text-3xl font-black mb-1 transition-colors ${isSelected ? 'text-green-600' : 'text-gray-900'
                                                        }`}>
                                                        ₹{fee.toFixed(0)}
                                                    </div>
                                                    <p className="text-xs text-gray-400 font-semibold">Total charge</p>
                                                </div>

                                                {/* Selection Indicator */}
                                                {isSelected && (
                                                    <div className="absolute top-4 right-4 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-green-200">
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                                                            <p className="text-gray-400 text-xs font-bold mb-1">Base Price</p>
                                                            <p className="text-gray-900 font-black">₹{vehicle.basePrice.toFixed(0)}</p>
                                                        </div>
                                                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                                                            <p className="text-gray-400 text-xs font-bold mb-1">Per KM</p>
                                                            <p className="text-gray-900 font-black">₹{vehicle.perKmPrice.toFixed(1)}</p>
                                                        </div>
                                                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                                                            <p className="text-gray-400 text-xs font-bold mb-1">Per KG</p>
                                                            <p className="text-gray-900 font-black">₹{vehicle.perKgPrice.toFixed(2)}</p>
                                                        </div>
                                                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                                                            <p className="text-gray-400 text-xs font-bold mb-1">Min Price</p>
                                                            <p className="text-gray-900 font-black">₹{vehicle.minPrice.toFixed(0)}</p>
                                                        </div>
                                                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                                                            <p className="text-gray-400 text-xs font-bold mb-1">Max Capacity</p>
                                                            <p className="text-gray-900 font-black">{vehicle.capacity} kg</p>
                                                        </div>
                                                        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                                                            <p className="text-gray-400 text-xs font-bold mb-1">Your Load</p>
                                                            <p className={`font-black ${totalKg > vehicle.capacity ? 'text-red-500' : 'text-green-600'}`}>{totalKg} kg</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </ScrollRevealCard>
                            );
                        })}
                    </div>
                )}

                {/* Selected Vehicle Summary */}
                {selectedVehicle && !isLoading && (
                    <div className="mt-4 p-4 md:p-6 bg-white border border-gray-100 rounded-3xl shadow-lg relative">
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200 rounded-3xl p-6">
                                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                    </svg>
                                    {selectedVehicle.name} Selected
                                </h3>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                                        <p className="text-gray-400 text-xs font-bold mb-2 uppercase">Charge</p>
                                        <p className="text-2xl font-black text-green-600">₹{calculateDeliveryFee(selectedVehicle).toFixed(0)}</p>
                                    </div>
                                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                                        <p className="text-gray-400 text-xs font-bold mb-2 uppercase">Est. Time</p>
                                        <p className="text-2xl font-black text-blue-500">{estimatedTimes[selectedVehicle.id]} min</p>
                                    </div>
                                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                                        <p className="text-gray-400 text-xs font-bold mb-2 uppercase">Capacity</p>
                                        <p className="text-2xl font-black text-gray-900">{selectedVehicle.capacity} kg</p>
                                    </div>
                                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                                        <p className="text-gray-400 text-xs font-bold mb-2 uppercase">Your Load</p>
                                        <p className={`text-2xl font-black ${totalKg <= selectedVehicle.capacity ? 'text-green-600' : 'text-red-500'}`}>
                                            {totalKg} kg
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeliveryVehicleSelector;
