import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { deliveryDealAPI } from '../services/api';
import { socketService } from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import TrackingMap from '../components/TrackingMap';
import StatusBadge from '../components/StatusBadge';

interface Location {
    lat: number;
    lng: number;
    address?: string;
}

interface DeliveryDetails {
    id: string;
    orderId: string;
    status: string;
    pickupLocation?: Location;
    dropLocation?: Location;
    transporterLocation?: Location;
    transporter?: {
        name?: string;
        phone?: string;
        transporterProfile?: {
            fullName?: string;
            phone?: string;
        };
    };
    selectedVehicle?: string;
    vehicleNumber?: string;
    distance?: number;
    estimatedDuration?: number;
    totalCost?: number;
    pricePerKm?: number;
    order?: {
        quantity?: number;
        priceFinal?: number;
        deliveryAddress?: string;
        buyer?: { name?: string; phone?: string };
        farmer?: { name?: string; phone?: string };
        listing?: {
            crop?: { name?: string };
            grade?: string;
            unit?: string;
        };
    };
}

const LiveTracking: React.FC = () => {
    const { deliveryId } = useParams<{ deliveryId: string }>();
    const [delivery, setDelivery] = useState<DeliveryDetails | null>(null);
    const [driverLoc, setDriverLoc] = useState<Location | null>(null);
    const [eta, setEta] = useState<{ distance: string; duration: string }>({ distance: '--', duration: '--' });
    const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
    const [totalDistance, setTotalDistance] = useState<number>(0);
    const [totalDuration, setTotalDuration] = useState<number>(0);
    const [remainingKm, setRemainingKm] = useState<number>(0);
    const [remainingEta, setRemainingEta] = useState<number>(0);
    const [routeProgress, setRouteProgress] = useState<number>(0);
    const [mapReady, setMapReady] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [followDriver, setFollowDriver] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [distanceToDrop, setDistanceToDrop] = useState<number | null>(null);
    const [showOutForDeliveryButton, setShowOutForDeliveryButton] = useState(false);
    const [locationSharingStatus, setLocationSharingStatus] = useState<{
        enabled: boolean;
        started?: Date;
        ended?: Date;
    } | null>(null);
    const { user } = useAuth();

    const hasCoords = (location?: Location | null) => {
        return location && typeof location.lat === 'number' && typeof location.lng === 'number' &&
            !Number.isNaN(location.lat) && !Number.isNaN(location.lng);
    };

    // Calculate driver progress along route and update status
    const calculateRouteProgress = (driverPos: Location, route: [number, number][]) => {
        if (route.length < 2) return 0;

        let minDistance = Infinity;
        let closestIndex = 0;

        // Find closest point on route to driver
        route.forEach((coord, index) => {
            const distance = Math.sqrt(
                Math.pow(coord[0] - driverPos.lat, 2) +
                Math.pow(coord[1] - driverPos.lng, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        const progress = closestIndex / route.length;
        return progress;
    };

    // Update status based on route progress
    const updateStatusBasedOnProgress = (progress: number) => {
        let newStatus = delivery?.status;

        // Only auto-update if not already in a later stage or if it's currently IN_TRANSIT
        if (delivery?.status === 'IN_TRANSIT' || delivery?.status === 'PICKED_UP') {
            if (progress < 0.25) {
                newStatus = 'PICKED_UP';
            } else if (progress < 0.75) {
                newStatus = 'IN_TRANSIT';
            } else if (progress >= 0.95) {
                // But auto-transition to OUT_FOR_DELIVERY if near 100%
                newStatus = 'OUT_FOR_DELIVERY';
            }
        }

        if (newStatus && newStatus !== delivery?.status) {
            setDelivery(prev => prev ? { ...prev, status: newStatus } : prev);
            socketService.emitDeliveryStatusUpdate(deliveryId!, newStatus);
        }
    };

    // Update delivery status based on route index
    const updateDeliveryStatus = (index: number) => {
        const progress = index / routeCoords.length;
        updateStatusBasedOnProgress(progress);
    };

    const deliveryRef = useRef(delivery);
    useEffect(() => {
        deliveryRef.current = delivery;
    }, [delivery]);

    useEffect(() => {
        if (!deliveryId) return;
        let isMounted = true;
        const fetchDelivery = async () => {
            try {
                const response = await deliveryDealAPI.getTracking(deliveryId);
                const data = response.deliveryDeal;
                if (!isMounted) return;
                setDelivery(data);

                // Set location sharing status from delivery data
                if (data.locationSharingEnabled !== undefined) {
                    setLocationSharingStatus({
                        enabled: data.locationSharingEnabled,
                        started: data.locationSharingStarted ? new Date(data.locationSharingStarted) : undefined,
                        ended: data.locationSharingEnded ? new Date(data.locationSharingEnded) : undefined
                    });
                }

                if (hasCoords(data?.transporterLocation)) {
                    setDriverLoc(data.transporterLocation);
                }
                // Set initial ETA from API or route data
                if (data?.distance || data?.estimatedDuration) {
                    setEta({
                        distance: typeof data.distance === 'number' ? data.distance.toFixed(1) : '--',
                        duration: typeof data.estimatedDuration === 'number' ? Math.round(data.estimatedDuration).toString() : '--'
                    });
                }
            } catch (err) {
                console.error("Error fetching delivery:", err);
                setError("Failed to load delivery details");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDelivery();
        socketService.connect();
        socketService.joinDeliveryRoom(deliveryId);

        // Listen for location sharing status updates
        const unsubscribeSharingStatus = socketService.onLocationSharingStatus((status) => {
            setLocationSharingStatus(status);
        });

        const unsubscribeLoc = socketService.onLocationUpdate((update: { lat: number, lng: number }) => {
            setDriverLoc(update);
            // Calculate remaining distance/time to drop-off using ref for latest data
            const currentDelivery = deliveryRef.current;
            if (hasCoords(currentDelivery?.dropLocation)) {
                const drop = currentDelivery!.dropLocation!;
                // Calculate straight-line distance (haversine formula)
                const R = 6371; // Earth's radius in km
                const dLat = (drop.lat - update.lat) * Math.PI / 180;
                const dLon = (drop.lng - update.lng) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(update.lat * Math.PI / 180) * Math.cos(drop.lat * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distanceKm = R * c;
                // Estimate time assuming average speed of 30 km/h
                const durationMin = Math.ceil(distanceKm / 30 * 60);

                // Update remaining values for display
                setRemainingKm(distanceKm);
                setRemainingEta(durationMin);

                setEta({
                    distance: distanceKm.toFixed(1),
                    duration: durationMin.toString()
                });

                // Store distance and check if within 5km for Out for Delivery button
                setDistanceToDrop(distanceKm);
                setShowOutForDeliveryButton(distanceKm <= 5 && currentDelivery?.status === 'IN_TRANSIT');
            }
        });

        const unsubscribeEta = socketService.onEtaUpdate((update) => {
            setEta({
                distance: update?.distance || '--',
                duration: typeof update?.duration === 'number' ? Math.round(update.duration).toString() : '--'
            });
        });

        return () => {
            isMounted = false;
            unsubscribeSharingStatus();
            unsubscribeLoc();
            unsubscribeEta();
            socketService.leaveDeliveryRoom(deliveryId);
        };
    }, [deliveryId, delivery?.dropLocation?.lat, delivery?.dropLocation?.lng]);

    useEffect(() => {
        if (!delivery?.orderId) return;
        socketService.joinOrderRoom(delivery.orderId);
        const unsubscribeStatus = socketService.onDeliveryStatusUpdate((update: any) => {
            const nextStatus = update?.deliveryDeal?.status || update?.status;
            if (nextStatus) {
                setDelivery(prev => prev ? { ...prev, status: nextStatus } : prev);
            }
        });
        return () => {
            unsubscribeStatus();
            socketService.leaveOrderRoom(delivery.orderId);
        };
    }, [delivery?.orderId]);

    useEffect(() => {
        if (!mapReady) return; // Wait for map to be ready

        const isPickedUp = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(delivery?.status || '');
        const pickup = delivery?.pickupLocation;
        const drop = delivery?.dropLocation;
        const driver = hasCoords(driverLoc) ? driverLoc : null;

        // Determine routing endpoints
        // Use driver as start if available, otherwise fallback to pickup for context
        const start = driver || pickup;
        // Target is pickup until picked up, then drop
        const target = isPickedUp ? drop : pickup;

        if (!hasCoords(start) || !hasCoords(target)) {
            setRouteCoords([]);
            return;
        }

        // If start and target are the same (e.g. at pickup point), just show a simple dot or empty route
        if (start!.lat === target!.lat && start!.lng === target!.lng && !isPickedUp && driver) {
            // If driver is at pickup but not yet in transit, maybe show pickup to drop for context?
            // Actually, let's just stick to the requested logic.
        }

        const fetchRoute = async () => {
            try {
                // Use OSRM to fetch route
                const url = `https://router.project-osrm.org/route/v1/driving/${start!.lng},${start!.lat};${target!.lng},${target!.lat}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                const data = await res.json();

                const route = data.routes[0];

                if (route && route.geometry && route.geometry.coordinates) {
                    const coords = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
                    setRouteCoords(coords);
                    setTotalDistance(route.distance); // in meters
                    setTotalDuration(route.duration); // in seconds

                    // Convert meters to KM and seconds to minutes for initial display
                    const distanceKm = (route.distance / 1000).toFixed(1);
                    const etaMinutes = Math.ceil(route.duration / 60);

                    setEta({
                        distance: distanceKm,
                        duration: etaMinutes.toString()
                    });
                } else {
                    // Fallback to static pickup-to-drop if dynamic route fails and we have both
                    if (hasCoords(pickup) && hasCoords(drop) && (start !== pickup || target !== drop)) {
                        const fallbackUrl = `https://router.project-osrm.org/route/v1/driving/${pickup!.lng},${pickup!.lat};${drop!.lng},${drop!.lat}?overview=full&geometries=geojson`;
                        const res2 = await fetch(fallbackUrl);
                        const data2 = await res2.json();
                        if (data2.routes?.[0]?.geometry?.coordinates) {
                            const coords = data2.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
                            setRouteCoords(coords);
                        }
                    } else {
                        setRouteCoords([]);
                    }
                }
            } catch (error) {
                console.error('Error fetching route:', error);
                setRouteCoords([]);
            }
        };
        fetchRoute();
    }, [delivery?.pickupLocation?.lat, delivery?.pickupLocation?.lng, delivery?.dropLocation?.lat, delivery?.dropLocation?.lng, delivery?.status, driverLoc?.lat, driverLoc?.lng, mapReady]);

    // Handle marking Out for Delivery when within 5km
    const handleMarkOutForDelivery = () => {
        if (deliveryId && distanceToDrop !== null && distanceToDrop <= 5) {
            socketService.emitDeliveryStatusUpdate(deliveryId, 'OUT_FOR_DELIVERY');
            setDelivery(prev => prev ? { ...prev, status: 'OUT_FOR_DELIVERY' } : prev);
            setShowOutForDeliveryButton(false);

            // Send notification to buyer
            if ((delivery?.order?.buyer as any)?.id) {
                socketService.emitNotification({
                    userId: (delivery?.order?.buyer as any).id,
                    title: 'Out For Delivery!',
                    message: `Your ${delivery.order?.listing?.crop?.name || 'order'} is out for delivery and will arrive soon.`,
                    type: 'info',
                    deliveryId: deliveryId
                });
            }
        }
    };

    // Handle map ready
    const handleMapReady = () => {
        setMapReady(true);
    };

    // Handle progress updates from the map component
    const handleProgressUpdate = (progress: number) => {
        setRouteProgress(progress);
        updateStatusBasedOnProgress(progress);

        // Calculate remaining distance and time based on progress
        const remainingDistance = totalDistance * (1 - progress);
        const remainingDuration = totalDuration * (1 - progress);

        // Convert meters to KM and seconds to minutes
        const distanceKm = (remainingDistance / 1000).toFixed(1);
        const etaMinutes = Math.ceil(remainingDuration / 60);

        setEta({
            distance: distanceKm,
            duration: etaMinutes.toString()
        });
    };

    // Real-time tracking using socket location updates only
    // Removed simulated movement - now tracks actual transporter location

    // Location sharing status indicator
    const LocationStatusIndicator = () => {
        if (!locationSharingStatus) return null;

        return (
            <div className="location-status-indicator flex items-center gap-2">
                {locationSharingStatus.enabled ? (
                    <div className="flex items-center gap-2 text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium">Live Location Active</span>
                        {locationSharingStatus.started && (
                            <span className="text-xs text-gray-400">
                                (Since {locationSharingStatus.started.toLocaleTimeString()})
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <span className="text-xs font-medium">Location Sharing Inactive</span>
                        {locationSharingStatus.ended && (
                            <span className="text-xs text-gray-400">
                                (Ended at {locationSharingStatus.ended.toLocaleTimeString()})
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;
    if (error || !delivery) return <div className="flex items-center justify-center h-screen bg-gray-50 text-red-500 font-bold">{error || "Delivery not found"}</div>;

    const pickup = delivery.pickupLocation;
    const drop = delivery.dropLocation;
    const driver = hasCoords(driverLoc) ? driverLoc : delivery.transporterLocation || null;
    const statusLabel = delivery.status ? delivery.status.split('_').join(' ') : 'IN TRANSIT';
    const statusChip = delivery.status === 'DELIVERED' || delivery.status === 'COMPLETED'
        ? 'bg-green-100 text-green-700'
        : delivery.status === 'OUT_FOR_DELIVERY'
            ? 'bg-purple-100 text-purple-700'
            : delivery.status === 'IN_TRANSIT'
                ? 'bg-blue-100 text-blue-700'
                : delivery.status === 'PICKED_UP'
                    ? 'bg-indigo-100 text-indigo-700'
                    : delivery.status === 'DRIVER_FOUND'
                        ? 'bg-orange-100 text-orange-700'
                        : delivery.status === 'ORDER_CONFIRMED'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-amber-100 text-amber-700';
    const progressWidth = delivery.status === 'DELIVERED' || delivery.status === 'COMPLETED'
        ? 'w-full'
        : delivery.status === 'OUT_FOR_DELIVERY'
            ? 'w-[90%]'
            : delivery.status === 'IN_TRANSIT'
                ? 'w-[75%]'
                : delivery.status === 'PICKED_UP'
                    ? 'w-[60%]'
                    : delivery.status === 'DRIVER_FOUND'
                        ? 'w-[40%]'
                        : delivery.status === 'ORDER_CONFIRMED'
                            ? 'w-[25%]'
                            : 'w-[20%]';
    const driverName = delivery.transporter?.transporterProfile?.fullName || delivery.transporter?.name || 'Transporter';
    const vehicleNumber = delivery.selectedVehicle || delivery.vehicleNumber || 'Vehicle pending';
    const cropName = delivery.order?.listing?.crop?.name || 'Produce';
    const quantity = delivery.order?.quantity ? `${delivery.order.quantity} kg` : '--';
    const priceFinal = typeof delivery.order?.priceFinal === 'number' ? `₹${delivery.order.priceFinal.toLocaleString()}` : '--';
    const totalCost = typeof delivery.totalCost === 'number' ? `₹${delivery.totalCost.toLocaleString()}` : '--';
    const showRouteHint = routeCoords.length === 0 && (!hasCoords(pickup) || !hasCoords(drop));
    const totalKm = (totalDistance / 1000).toFixed(1);
    const etaDisplay = remainingEta > 0 ? `${remainingEta} min` : '--';
    const distanceDisplay = remainingKm > 0 ? `${remainingKm} km` : '--';
    const isPickedUp = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(delivery.status || '');
    const driverStatus = hasCoords(driver)
        ? `GPS Active • ${etaDisplay} to ${isPickedUp ? 'delivery' : 'pickup'}`
        : 'Waiting for driver';

    // Debug: Log driver position to console
    console.log('LiveTracking Debug:', {
        driver,
        hasDriverCoords: hasCoords(driver),
        driverLoc,
        remainingKm,
        remainingEta
    });

    const isFarmer = user?.role === 'FARMER';
    const dynamicPickupLabel = isFarmer ? 'Your Farm' : 'Farm Location';
    const dynamicDropLabel = isFarmer ? 'Buyer Location' : 'Your Location';

    const panels = useMemo(() => ([
        { label: 'Crop', value: cropName },
        { label: 'Quantity', value: quantity },
        { label: 'Order Price', value: priceFinal },
        { label: 'Delivery Fee', value: totalCost }
    ]), [cropName, quantity, priceFinal, totalCost]);

    return (
        <div className="h-screen w-screen relative overflow-hidden bg-gray-100 font-sans">
            <div className="absolute inset-0">
                <TrackingMap
                    pickup={pickup}
                    drop={drop}
                    driver={driver}
                    routeCoords={routeCoords}
                    followDriver={followDriver}
                    onProgressUpdate={handleProgressUpdate}
                    onMapReady={handleMapReady}
                    pickupLabel={isFarmer ? "Your Farm" : "Farm Location"}
                    dropLabel={isFarmer ? "Buyer Location" : "Your Location"}
                    refreshTrigger={loading}
                />
                {showRouteHint && (
                    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-sm text-xs font-bold text-gray-600">
                        Route will appear once pickup and drop coordinates are available
                    </div>
                )}
            </div>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-4xl">
                <div className="bg-white/90 backdrop-blur-xl p-3 md:p-5 rounded-[24px] md:rounded-[28px] shadow-2xl border border-white/30 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Live Tracking</span>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusChip}`}>
                            {statusLabel}
                        </div>
                        <LocationStatusIndicator />
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-1">ETA</span>
                            <span className="text-lg font-black text-blue-600">{etaDisplay}</span>
                        </div>
                        <div className="text-center">
                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-1">Distance</span>
                            <span className="text-lg font-black text-gray-900">{distanceDisplay}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setFollowDriver(prev => !prev)}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${followDriver ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-400'
                            }`}
                        aria-label={followDriver ? "Stop following driver" : "Follow driver"}
                    >
                        <i className={`fas ${followDriver ? 'fa-location-arrow' : 'fa-crosshairs'}`}></i>
                    </button>
                </div>
            </div>

            <div className="hidden lg:flex absolute right-6 top-28 z-[1000] w-[360px] flex-col gap-4">
                <div className="bg-white/95 backdrop-blur rounded-[28px] shadow-xl border border-gray-100 overflow-hidden">
                    <div className={`h-1 ${progressWidth} bg-blue-600 transition-all duration-700`}></div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Order</p>
                                <p className="text-lg font-black text-gray-900">{cropName}</p>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mt-1">#{delivery.id.slice(0, 8)}</p>
                            </div>
                            <StatusBadge status={delivery.status} type="delivery" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {panels.map(panel => (
                                <div key={panel.label} className="bg-gray-50 rounded-2xl p-3">
                                    <p className="text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1">{panel.label}</p>
                                    <p className="text-sm font-black text-gray-900">{panel.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white/95 backdrop-blur rounded-[28px] shadow-xl border border-gray-100 p-6">
                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-4">Route</p>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500"></div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">{dynamicPickupLabel}</p>
                                <p className="text-xs font-bold text-gray-700">{pickup?.address || 'Pickup address'}</p>
                                <p className="text-[10px] text-gray-400 mt-1">Farmer: {delivery.order?.farmer?.name || 'Farmer'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-1 w-2 h-2 rounded-full bg-blue-500"></div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">{dynamicDropLabel}</p>
                                <p className="text-xs font-bold text-gray-700">{drop?.address || delivery.order?.deliveryAddress || 'Drop-off address'}</p>
                                <p className="text-[10px] text-gray-400 mt-1">Buyer: {delivery.order?.buyer?.name || 'Buyer'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/95 backdrop-blur rounded-[28px] shadow-xl border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Transporter</p>
                            <p className="text-lg font-black text-gray-900">{driverName}</p>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">{vehicleNumber}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-xl">
                            <i className="fas fa-truck-fast"></i>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">{driverStatus}</span>
                        <span className="text-[10px] uppercase font-black tracking-widest text-blue-600">{distanceDisplay}</span>
                    </div>
                    {/* Mark Out for Delivery Button */}
                    {showOutForDeliveryButton && (
                        <button
                            onClick={handleMarkOutForDelivery}
                            className="w-full mt-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-box-open"></i>
                            Mark Out for Delivery
                        </button>
                    )}
                </div>
            </div>

            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-[600px] lg:hidden transition-all duration-500 ease-in-out`}>
                <div className={`bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_60px_rgba(15,23,42,0.3)] border border-white/60 overflow-hidden relative transition-all duration-300 ${!isExpanded ? 'p-3' : 'p-6 md:p-8'}`}>
                    <div className={`absolute top-0 left-0 h-1 bg-blue-600 transition-all duration-700 opacity-60`} style={{ width: progressWidth }}></div>

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
                                    <p className="text-sm font-black text-blue-600 leading-none">{etaDisplay}</p>
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
                                        <p className="text-sm font-black text-gray-900">{etaDisplay}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1">Left</p>
                                        <p className="text-sm font-black text-gray-900">{distanceDisplay}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1">Fee</p>
                                        <p className="text-sm font-black text-green-600 text-nowrap">{totalCost}</p>
                                    </div>
                                </div>
                            </div>

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
    );
};

export default LiveTracking;
