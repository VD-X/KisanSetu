import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TrackingMap from '../components/TrackingMap';

const TestTracking = () => {
    const navigate = useNavigate();
    
    // Salampad, Bodhan, Nizamabad - Pickup location
    const pickup = {
        lat: 18.7634,
        lng: 78.6161,
        address: 'Salampad, Bodhan Mandal, Nizamabad District, Telangana'
    };

    // Delivery location - Nizamabad City Center (approx 20km away)
    const drop = {
        lat: 18.6714,
        lng: 78.0955,
        address: 'Nizamabad City Center, Telangana'
    };

    const [driverLoc, setDriverLoc] = useState(pickup);
    const [routeCoords, setRouteCoords] = useState([]);
    const [totalRouteDistance, setTotalRouteDistance] = useState(null);
    const [eta, setEta] = useState({ distance: '0', duration: '0' });
    const [isMoving, setIsMoving] = useState(false);
    const [routeProgress, setRouteProgress] = useState(0);

    // Fetch optimized route from OSRM
    useEffect(() => {
        const fetchRoute = async () => {
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`;
                const response = await fetch(url);
                const data = await response.json();
                
                if (data?.routes?.[0]) {
                    const route = data.routes[0];
                    const coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);
                    setRouteCoords(coords);
                    
                    const distKm = route.distance / 1000;
                    const durMin = route.duration / 60;
                    
                    setTotalRouteDistance(distKm);
                    setEta({
                        distance: distKm.toFixed(1),
                        duration: Math.round(durMin).toString()
                    });
                }
            } catch (err) {
                console.error('Route fetch error:', err);
            }
        };

        fetchRoute();
    }, []);

    // Simulate vehicle movement along the route
    useEffect(() => {
        if (!isMoving || routeCoords.length === 0) return;

        let progress = routeProgress;
        const interval = setInterval(() => {
            progress += 0.5; // Move 0.5% along the route each interval

            if (progress >= 100) {
                setIsMoving(false);
                setRouteProgress(100);
                return;
            }

            setRouteProgress(progress);

            // Interpolate vehicle position along the route
            const coordIndex = Math.floor((progress / 100) * (routeCoords.length - 1));
            const nextIndex = Math.min(coordIndex + 1, routeCoords.length - 1);
            const ratio = ((progress / 100) * (routeCoords.length - 1)) - coordIndex;

            const currentCoord = routeCoords[coordIndex];
            const nextCoord = routeCoords[nextIndex];

            const interpolatedLat = currentCoord[0] + (nextCoord[0] - currentCoord[0]) * ratio;
            const interpolatedLng = currentCoord[1] + (nextCoord[1] - currentCoord[1]) * ratio;

            setDriverLoc({
                lat: interpolatedLat,
                lng: interpolatedLng,
                address: `In Transit - ${progress.toFixed(0)}% complete`
            });

            // Update remaining distance
            const remainingPercent = 100 - progress;
            const remainingDist = (totalRouteDistance * remainingPercent) / 100;
            const remainingTime = Math.ceil((eta.duration * remainingPercent) / 100);

            setEta({
                distance: remainingDist.toFixed(1),
                duration: remainingTime.toString()
            });
        }, 300);

        return () => clearInterval(interval);
    }, [isMoving, routeCoords, routeProgress, totalRouteDistance, eta.duration]);

    const handleStartTracking = () => {
        setRouteProgress(0);
        setDriverLoc(pickup);
        setIsMoving(true);
    };

    const handleResetTracking = () => {
        setIsMoving(false);
        setRouteProgress(0);
        setDriverLoc(pickup);
        setEta({
            distance: totalRouteDistance?.toFixed(1) || '0',
            duration: (routeCoords.length > 0 ? Math.ceil((totalRouteDistance / 50) * 60) : 0).toString()
        });
    };

    return (
        <div className="h-screen w-screen relative overflow-hidden bg-gray-100 font-sans flex">
            {/* Left Sidebar - Details */}
            <div className="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 md:p-6 z-50">
                    <div className="flex items-center gap-3 mb-4">
                        <button
                            onClick={() => navigate('/')}
                            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
                            aria-label="Back"
                        >
                            <i className="fas fa-arrow-left text-sm"></i>
                        </button>
                        <h1 className="text-2xl font-black">Live Tracking Demo</h1>
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center gap-2 bg-white/20 border border-white/40 rounded-lg px-3 py-2">
                        <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isMoving ? 'bg-green-300' : 'bg-gray-300'}`}></div>
                        <span className="text-sm font-bold">{isMoving ? 'In Transit' : 'Ready'}</span>
                    </div>
                </div>

                {/* Progress Timeline */}
                <div className="px-5 md:px-6 py-6 border-b border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Delivery Progress</p>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">Pickup Done</p>
                                <p className="text-xs text-gray-500">Salampad, Bodhan</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                isMoving ? 'bg-orange-500 text-white animate-pulse' : 'bg-gray-200 text-gray-600'
                            }`}>
                                <i className="fas fa-truck text-xs"></i>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">In Transit</p>
                                <p className="text-xs text-gray-500">{routeProgress.toFixed(0)}% completed</p>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${routeProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                routeProgress >= 95 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                                <i className="fas fa-home text-xs"></i>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">Delivery</p>
                                <p className="text-xs text-gray-500">Nizamabad City</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details */}
                <div className="px-5 md:px-6 py-6 border-b border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Details</p>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">ETA</span>
                            <span className="text-sm font-bold text-blue-600">{eta.duration} min</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Distance Left</span>
                            <span className="text-sm font-bold text-green-600">{eta.distance} km</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Route</span>
                            <span className="text-sm font-bold text-gray-900">{totalRouteDistance?.toFixed(1) || '--'} km</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Vehicle</span>
                            <span className="text-sm font-bold text-gray-900">Truck #KA01AB1234</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Driver</span>
                            <span className="text-sm font-bold text-gray-900">Rajesh Kumar</span>
                        </div>
                    </div>
                </div>

                {/* Locations */}
                <div className="px-5 md:px-6 py-6 border-b border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Locations</p>
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5"></div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1">PICKUP (FARMER)</p>
                                <p className="text-sm font-bold text-gray-800">{pickup.address}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0 mt-1.5"></div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-1">DROP (DELIVERY)</p>
                                <p className="text-sm font-bold text-gray-800">{drop.address}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="px-5 md:px-6 py-6 flex-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Controls</p>
                    <div className="space-y-3">
                        <button
                            onClick={handleStartTracking}
                            disabled={isMoving}
                            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                        >
                            <i className="fas fa-play mr-2"></i>
                            {isMoving ? 'Moving...' : 'Start Tracking'}
                        </button>
                        <button
                            onClick={handleResetTracking}
                            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition"
                        >
                            <i className="fas fa-redo mr-2"></i>
                            Reset
                        </button>
                    </div>
                    <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700 font-semibold">
                            <i className="fas fa-info-circle mr-2"></i>
                            Click "Start Tracking" to see the vehicle move along the optimized green route from Salampad to Nizamabad City.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Map */}
            <div className="hidden md:flex flex-1 relative bg-gray-200">
                <TrackingMap
                    pickup={pickup}
                    drop={drop}
                    driver={driverLoc}
                    routeCoords={routeCoords}
                    followDriver={isMoving}
                />

                {/* Route Info Badge */}
                {routeCoords.length > 0 && (
                    <div className="absolute top-4 right-4 z-50 px-4 py-3 rounded-xl bg-white/95 backdrop-blur border border-green-300 shadow-lg">
                        <p className="text-xs font-bold text-gray-700 mb-1">Optimized Route</p>
                        <p className="text-lg font-black text-green-600">{totalRouteDistance?.toFixed(1)} km</p>
                        <p className="text-xs text-gray-500 mt-1">Salampad → Nizamabad</p>
                    </div>
                )}

                {/* Status Badge */}
                <div className="absolute bottom-4 left-4 z-50 px-4 py-3 rounded-xl bg-white/95 backdrop-blur border border-blue-300 shadow-lg">
                    <p className="text-xs font-bold text-gray-700">Status: {isMoving ? 'In Transit' : 'Ready'}</p>
                    <p className="text-sm font-black text-blue-600 mt-1">{routeProgress.toFixed(0)}%</p>
                </div>
            </div>
        </div>
    );
};

export default TestTracking;
