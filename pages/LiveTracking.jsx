import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socketService } from '../services/socketService';
import { deliveryDealAPI } from '../services/api';
import TrackingMap from '../components/TrackingMap';
import StatusBadge from '../components/StatusBadge';
import DetailedTrackingTimeline from '../components/DetailedTrackingTimeline';
import { useAuth } from '../context/AuthContext';

const LiveTracking = () => {
    const { deliveryId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [delivery, setDelivery] = useState(null);
    const [driverLoc, setDriverLoc] = useState(null);
    const [eta, setEta] = useState({ distance: '--', duration: '--' });
    const [geoStatus, setGeoStatus] = useState('idle');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [followDriver, setFollowDriver] = useState(true);
    const [routeCoords, setRouteCoords] = useState([]);
    const [routeError, setRouteError] = useState(null);
    const [routeMeta, setRouteMeta] = useState({ distanceKm: null, durationMin: null });
    const [totalRouteDistance, setTotalRouteDistance] = useState(null);

    const hasCoords = (location) => {
        return location && typeof location.lat === 'number' && typeof location.lng === 'number' &&
            !Number.isNaN(location.lat) && !Number.isNaN(location.lng);
    };

    const distanceKmBetween = (a, b) => {
        const toRad = (value) => (value * Math.PI) / 180;
        const earthRadiusKm = 6371;
        const dLat = toRad(b[0] - a[0]);
        const dLng = toRad(b[1] - a[1]);
        const lat1 = toRad(a[0]);
        const lat2 = toRad(b[0]);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
    };

    const cumulativeDistances = useMemo(() => {
        if (routeCoords.length < 2) return [];
        let total = 0;
        const cumulative = [0];
        for (let i = 1; i < routeCoords.length; i += 1) {
            total += distanceKmBetween(routeCoords[i - 1], routeCoords[i]);
            cumulative.push(total);
        }
        return cumulative;
    }, [routeCoords]);

    // Find closest point on route to driver location
    const findClosestRoutePoint = (driverPos) => {
        if (routeCoords.length === 0 || !driverPos) return null;

        let minDist = Infinity;
        let closestIndex = 0;

        for (let i = 0; i < routeCoords.length; i++) {
            const dist = distanceKmBetween([driverPos.lat, driverPos.lng], routeCoords[i]);
            if (dist < minDist) {
                minDist = dist;
                closestIndex = i;
            }
        }

        return { index: closestIndex, distance: minDist };
    };

    // Calculate remaining distance along the route
    const calculateRemainingDistance = (driverPos) => {
        if (routeCoords.length === 0 || !driverPos || cumulativeDistances.length === 0) {
            return totalRouteDistance || '--';
        }

        const closest = findClosestRoutePoint(driverPos);
        if (!closest) return totalRouteDistance || '--';

        const closestIndex = closest.index;
        const totalDistKm = totalRouteDistance || 0;

        if (closestIndex >= cumulativeDistances.length - 1) {
            const dropLocation = delivery?.dropLocation;
            if (dropLocation) {
                return distanceKmBetween([driverPos.lat, driverPos.lng], [dropLocation.lat, dropLocation.lng]).toFixed(1);
            }
            return '0';
        }

        const distanceAlongRoute = cumulativeDistances[closestIndex];
        const remainingDist = totalDistKm - distanceAlongRoute;
        return Math.max(0, remainingDist).toFixed(1);
    };

    useEffect(() => {
        if (!deliveryId) {
            setError('Delivery ID missing');
            setLoading(false);
            return;
        }
        let isMounted = true;
        const fetchInitialData = async () => {
            try {
                const response = await deliveryDealAPI.getTracking(deliveryId);
                const data = response.deliveryDeal;

                if (!isMounted) return;
                setDelivery(data);
                if (hasCoords(data?.transporterLocation)) {
                    setDriverLoc(data.transporterLocation);
                }
                // Set initial ETA from API data if available
                if (data?.distance || data?.estimatedDuration) {
                    setEta({
                        distance: typeof data.distance === 'number' ? data.distance.toFixed(1) : '--',
                        duration: typeof data.estimatedDuration === 'number' ? Math.round(data.estimatedDuration).toString() : '--'
                    });
                }
            } catch (err) {
                console.error('Fetch tracking error:', err);
                if (err?.status === 400 || err?.message?.includes('Invalid')) {
                    setError('Invalid delivery ID. Please use the link from your order.');
                } else if (err?.status === 404) {
                    setError('Delivery tracking not found. Please check the delivery ID.');
                } else if (err?.status === 403) {
                    setError('You are not authorized to view this delivery.');
                } else {
                    setError('Failed to load tracking data. Please try again.');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchInitialData();

        // Connect socket and set up listeners
        socketService.connect();

        // Wait a bit for socket to connect before joining room
        setTimeout(() => {
            socketService.joinDeliveryRoom(deliveryId);
        }, 100);

        const unsubStatus = socketService.onDeliveryStatusUpdate((update) => {
            const nextStatus = update?.deliveryDeal?.status || update?.status;
            if (nextStatus) {
                setDelivery(prev => prev ? { ...prev, status: nextStatus } : prev);
            }
        });

        const unsubLoc = socketService.onLocationUpdate((update) => {
            if (hasCoords(update)) {
                // Always store the latest location from socket
                // But effectiveDriverLoc will decide what to display based on status
                setDriverLoc(update);
            }
        });

        const unsubEta = socketService.onEtaUpdate((update) => {
            // Socket provides ETA from current driver location to drop
            if (update?.duration) {
                setEta(prev => ({
                    ...prev,
                    duration: typeof update.duration === 'number' ? Math.round(update.duration).toString() : update.duration || '--'
                }));
            }
            if (update?.distance) {
                setEta(prev => ({
                    ...prev,
                    distance: typeof update.distance === 'string' ? update.distance : String(update.distance)
                }));
            }
        });

        // Periodically refresh delivery data to get latest transporter location (fallback)
        const refreshInterval = setInterval(async () => {
            if (!isMounted) return;
            try {
                const response = await deliveryDealAPI.getTracking(deliveryId);
                const data = response.deliveryDeal;
                if (isMounted && data?.transporterLocation && hasCoords(data.transporterLocation)) {
                    // Only update if we have a valid location and status allows it
                    if (data.status === 'PICKED_UP' || data.status === 'IN_TRANSIT') {
                        setDriverLoc(data.transporterLocation);
                    }
                    // Update delivery status if changed
                    setDelivery(prev => prev ? { ...prev, ...data } : data);
                }
            } catch (err) {
                // Silently fail - socket updates are primary
            }
        }, 5000); // Refresh every 5 seconds as fallback

        return () => {
            isMounted = false;
            clearInterval(refreshInterval);
            unsubStatus();
            unsubLoc();
            unsubEta();
            socketService.leaveDeliveryRoom(deliveryId);
        };
    }, [deliveryId]);

    // Only use geolocation if user is transporter (not buyer/farmer viewing tracking)
    // For buyers/farmers, rely on socket updates from transporter
    useEffect(() => {
        // Skip geolocation watch - rely on socket updates from transporter
        setGeoStatus('active');
    }, [deliveryId]);

    useEffect(() => {
        const pickup = delivery?.pickupLocation;
        const drop = delivery?.dropLocation;
        if (!hasCoords(pickup) || !hasCoords(drop)) {
            setRouteCoords([]);
            return;
        }
        const fetchRoute = async () => {
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`;
                const response = await fetch(url);
                const data = await response.json();

                if (data?.code !== 'Ok' || !data.routes?.length) {
                    setRouteError('Route unavailable');
                    setRouteCoords([]);
                    // Fallback: calculate straight-line distance
                    const straightLineDistance = distanceKmBetween(
                        [pickup.lat, pickup.lng],
                        [drop.lat, drop.lng]
                    );
                    setTotalRouteDistance(straightLineDistance);
                    // Only set ETA if not already set
                    if (eta.duration === '--' || eta.distance === '--') {
                        setEta({
                            distance: straightLineDistance.toFixed(1),
                            duration: Math.round((straightLineDistance / 50) * 60).toString() // Assume 50 km/h avg
                        });
                    }
                    return;
                }
                const route = data.routes[0];
                const coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);
                setRouteCoords(coords);
                const totalDistKm = route.distance / 1000;
                const totalDurationMin = route.duration / 60;
                setTotalRouteDistance(totalDistKm);
                setRouteMeta({
                    distanceKm: totalDistKm,
                    durationMin: totalDurationMin
                });
                // Set initial ETA from optimized route (only if not already set)
                if (eta.duration === '--' || eta.distance === '--') {
                    setEta({
                        distance: totalDistKm.toFixed(1),
                        duration: Math.round(totalDurationMin).toString()
                    });
                }
                setRouteError(null);
            } catch {
                setRouteError('Route unavailable');
                setRouteCoords([]);
            }
        };
        fetchRoute();
    }, [delivery?.pickupLocation?.lat, delivery?.pickupLocation?.lng, delivery?.dropLocation?.lat, delivery?.dropLocation?.lng]);

    // Determine driver location based on status, snapped to optimized route
    const effectiveDriverLoc = useMemo(() => {
        const status = delivery?.status;
        const pickup = delivery?.pickupLocation;
        const drop = delivery?.dropLocation;

        // During IN_TRANSIT, show live transporter location if available
        if (status === 'IN_TRANSIT' && hasCoords(driverLoc)) {
            if (!hasCoords(drop)) {
                return driverLoc;
            }

            // Check if transporter is very close to drop (within 100m)
            const distToDrop = distanceKmBetween([driverLoc.lat, driverLoc.lng], [drop.lat, drop.lng]);
            if (distToDrop < 0.1) {
                return drop;
            }

            // If we have an optimized route, snap driver to the closest point on route
            if (routeCoords.length > 0) {
                const closest = findClosestRoutePoint(driverLoc);
                if (closest && closest.distance < 0.5) { // Within 500m, snap to route
                    return {
                        lat: routeCoords[closest.index][0],
                        lng: routeCoords[closest.index][1],
                        address: driverLoc.address || 'En route'
                    };
                }
            }

            return driverLoc;
        }

        // If no driver location during IN_TRANSIT, create a mock position along the route for testing
        if (status === 'IN_TRANSIT') {
            if (hasCoords(driverLoc)) {
                return driverLoc; // Use real driver location if available
            }

            // For testing: create a mock position along the route
            if (routeCoords.length > 10) {
                const mockIndex = Math.floor(routeCoords.length * 0.3); // 30% along the route
                return {
                    lat: routeCoords[mockIndex][0],
                    lng: routeCoords[mockIndex][1],
                    address: 'Mock position for testing'
                };
            }

            return hasCoords(pickup) ? pickup : null;
        }

        // During PICKED_UP (Out for Delivery), show live transporter location
        if (status === 'PICKED_UP') {
            if (!hasCoords(driverLoc) || !hasCoords(drop)) {
                return hasCoords(pickup) ? pickup : null;
            }

            // Check if transporter is very close to drop (within 100m)
            const distToDrop = distanceKmBetween([driverLoc.lat, driverLoc.lng], [drop.lat, drop.lng]);
            if (distToDrop < 0.1) {
                return drop;
            }

            // If we have an optimized route, snap driver to the closest point on route
            if (routeCoords.length > 0) {
                const closest = findClosestRoutePoint(driverLoc);
                if (closest && closest.distance < 0.5) { // Within 500m, snap to route
                    return {
                        lat: routeCoords[closest.index][0],
                        lng: routeCoords[closest.index][1],
                        address: driverLoc.address
                    };
                }
            }

            return driverLoc;
        }

        // For other statuses
        return hasCoords(driverLoc) ? driverLoc : (hasCoords(pickup) ? pickup : null);
    }, [delivery?.status, delivery?.pickupLocation, delivery?.dropLocation, driverLoc, routeCoords]);

    // Calculate remaining distance from driver to drop when driver location updates
    useEffect(() => {
        const drop = delivery?.dropLocation;
        if (!effectiveDriverLoc || !hasCoords(drop)) return;

        // Calculate remaining distance along the optimized route
        const remainingDist = calculateRemainingDistance(effectiveDriverLoc);
        const remainingDistNum = parseFloat(remainingDist);

        // Calculate remaining time based on average speed (50 km/h)
        const remainingTimeMin = remainingDistNum > 0 ? Math.round((remainingDistNum / 50) * 60) : 0;

        setEta(prev => ({
            ...prev,
            distance: remainingDist,
            duration: remainingTimeMin.toString()
        }));
    }, [effectiveDriverLoc, delivery?.dropLocation, routeCoords, totalRouteDistance, cumulativeDistances]);

    const isFarmer = user?.role === 'FARMER';
    const dynamicPickupLabel = isFarmer ? 'Your Farm' : 'Farm Location';
    const dynamicDropLabel = isFarmer ? 'Buyer Location' : 'Your Location';

    const panels = useMemo(() => ([
        { label: 'ETA', value: eta.duration !== '--' ? `${eta.duration} min` : '--' },
        { label: 'Distance', value: eta.distance !== '--' ? `${eta.distance} km` : '--' }
    ]), [eta.distance, eta.duration]);

    if (loading) return (
        <div className="h-screen w-screen flex items-center justify-center bg-gray-50 uppercase tracking-widest font-black text-gray-400">
            <i className="fas fa-spinner fa-spin mr-3"></i> Initializing GPS...
        </div>
    );

    if (error) return <div className="p-8 text-red-600 font-bold">{error}</div>;

    const pickup = delivery?.pickupLocation;
    const drop = delivery?.dropLocation;
    const hasPickupCoords = hasCoords(pickup);
    const hasDropCoords = hasCoords(drop);
    const hasRoute = routeCoords.length > 0;
    const showRouteHint = !hasRoute && !(hasPickupCoords && hasDropCoords);
    const driverName = delivery?.transporter?.transporterProfile?.fullName || delivery?.transporter?.name || 'Assigned Transporter';
    const vehicleNumber = delivery?.selectedVehicle || delivery?.vehicleNumber || 'Vehicle pending';
    const statusLabel = delivery?.status ? delivery.status.replaceAll('_', ' ') : 'IN TRANSIT';
    const geoLabel = geoStatus === 'active' ? 'Live GPS' : geoStatus === 'blocked' ? 'GPS blocked' : geoStatus === 'unavailable' ? 'GPS unavailable' : 'Starting GPS';
    const price = typeof delivery?.totalCost === 'number' ? `₹${delivery.totalCost.toLocaleString()}` : '₹--';
    const routeHintText = routeError ? routeError : 'Route will appear once pickup and drop coordinates are available';

    return (
        <div className="h-screen w-screen relative overflow-hidden bg-gray-100 font-sans flex">
            {/* Left side - Map */}
            <div className="flex-1 relative">
                <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-6 py-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-12 h-12 bg-white rounded-full shadow-md border border-white/40 text-gray-700 flex items-center justify-center hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        aria-label="Back to dashboard"
                    >
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div className="hidden md:flex items-center gap-3 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md border border-white/40">
                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">{geoLabel}</span>
                        <div className="h-4 w-[1px] bg-gray-200"></div>
                        <StatusBadge status={delivery?.status || 'IN_TRANSIT'} type="delivery" />
                    </div>
                </div>

                <div className="absolute inset-0">
                    <TrackingMap
                        pickup={pickup}
                        drop={drop}
                        driver={effectiveDriverLoc}
                        routeCoords={routeCoords}
                        followDriver={followDriver && ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(delivery?.status)}
                        pickupLabel="Farm"
                        dropLabel="Your Location"
                        refreshTrigger={loading}
                    />
                    {showRouteHint && (
                        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-sm text-xs font-bold text-gray-600">
                            {routeHintText}
                        </div>
                    )}
                    {routeCoords.length > 0 && (
                        <div className="absolute top-20 right-4 z-[1000] px-3 py-2 rounded-xl bg-white/95 backdrop-blur border border-green-200 shadow-md flex items-center gap-2">
                            <span className="w-3 h-0.5 rounded-full bg-green-500 flex-shrink-0" style={{ width: 24 }} />
                            <span className="text-xs font-bold text-gray-700">Optimized route: Farmer → Buyer</span>
                        </div>
                    )}
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-[600px]">
                    <div className={`bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_60px_rgba(15,23,42,0.3)] border border-white/60 overflow-hidden relative transition-all duration-300 ${!isExpanded ? 'p-3' : 'p-6 md:p-8'}`}>
                        {/* Progress bar at the top edge */}
                        <div className="absolute top-0 left-0 h-1 bg-blue-600 transition-all duration-700" style={{ width: eta.distance !== '--' && totalRouteDistance ? `${Math.min(100, (1 - (parseFloat(eta.distance) / totalRouteDistance)) * 100)}%` : '0%' }}></div>

                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="w-full flex items-center gap-4 text-left relative active:scale-[0.98] transition-transform"
                        >
                            <div className={`flex items-center justify-center shrink-0 transition-all duration-300 ${!isExpanded ? 'w-10 h-10 bg-blue-50 text-blue-600 rounded-xl text-xl' : 'w-14 h-14 bg-blue-600 text-white rounded-2xl text-2xl shadow-lg shadow-blue-200'}`}>
                                <i className="fas fa-truck-fast"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={`font-black text-gray-900 leading-tight truncate transition-all ${!isExpanded ? 'text-base' : 'text-xl'}`}>{driverName}</h3>
                                <p className={`text-blue-600 font-black uppercase tracking-widest leading-none mt-1 transition-all ${!isExpanded ? 'text-[9px]' : 'text-[11px]'}`}>
                                    {isExpanded ? 'Click for less' : 'Click for more details'}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                {!isExpanded && (
                                    <div className="text-right">
                                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-400 block mb-0.5">ETA</p>
                                        <p className="text-sm font-black text-blue-600 leading-none">{eta.duration !== '--' ? `${eta.duration} min` : '--'}</p>
                                    </div>
                                )}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-blue-50 text-blue-600 rotate-180' : 'bg-blue-600 text-white shadow-md'}`}>
                                    <i className="fas fa-chevron-up text-sm"></i>
                                </div>
                            </div>
                        </button>

                        <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-6 pt-6 border-t border-gray-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden mt-0 pt-0'}`}>
                            <div className="overflow-hidden space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="flex flex-col">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">Status</p>
                                        <p className="text-lg font-black text-gray-900 capitalize">{statusLabel.toLowerCase()}</p>
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mt-1">{vehicleNumber}</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                                            <p className="text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1">ETA</p>
                                            <p className="text-sm font-black text-gray-900">{eta.duration !== '--' ? `${eta.duration} min` : '--'}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                                            <p className="text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1">Left</p>
                                            <p className="text-sm font-black text-gray-900">{eta.distance !== '--' ? `${eta.distance} km` : '--'}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                                            <p className="text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1">Fee</p>
                                            <p className="text-sm font-black text-green-600 text-nowrap">{price}</p>
                                        </div>
                                    </div>
                                </div>

                                {hasRoute && totalRouteDistance && (
                                    <div className="flex items-center gap-2 py-2.5 px-3.5 rounded-xl bg-green-50/50 border border-green-100">
                                        <i className="fas fa-route text-green-600"></i>
                                        <p className="text-[11px] font-bold text-green-800">
                                            Route: {totalRouteDistance.toFixed(1)} km from pickup to drop.
                                        </p>
                                    </div>
                                )}

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="flex gap-3 items-start bg-gray-50/50 rounded-2xl border border-gray-100 px-4 py-3">
                                        <div className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] uppercase font-black tracking-widest text-gray-400 mb-0.5">{dynamicPickupLabel}</p>
                                            <p className="text-xs font-bold text-gray-700 line-clamp-2">{pickup?.address || 'Farmer Location'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start bg-gray-50/50 rounded-2xl border border-gray-100 px-4 py-3">
                                        <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500"></div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] uppercase font-black tracking-widest text-gray-400 mb-0.5">{dynamicDropLabel}</p>
                                            <p className="text-xs font-bold text-gray-700 line-clamp-2">{drop?.address || 'Your Location'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side - Detailed Timeline (desktop only) */}
            <div className="hidden lg:block w-96 border-l border-gray-200 bg-white">
                <DetailedTrackingTimeline
                    delivery={delivery}
                    driverLocation={delivery?.status === 'PICKED_UP' ? driverLoc : null}
                    pickupLocation={pickup}
                    dropLocation={drop}
                />
            </div>
        </div>
    );
};

export default LiveTracking;
