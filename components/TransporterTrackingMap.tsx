import React, { useEffect, useState } from 'react';
import TrackingMap from './TrackingMap';

interface Location {
    lat: number;
    lng: number;
    address?: string;
}

interface TransporterTrackingMapProps {
    deal: any;
    driverLocation: Location | null;
    isPreview?: boolean;
}

const TransporterTrackingMap: React.FC<TransporterTrackingMapProps> = ({ deal, driverLocation, isPreview = false }) => {
    const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

    const [viewMode, setViewMode] = useState<'PICKUP' | 'TRIP'>(isPreview ? 'PICKUP' : 'PICKUP');

    // Determine phases
    const isToPickup = isPreview ? (viewMode === 'PICKUP') : (deal.status === 'TRANSPORTER_ASSIGNED' || deal.status === 'DRIVER_FOUND');

    // Calculate Route Source and Destination for Navigation
    // If viewMode is PICKUP: Source=Driver, Dest=Farmer
    // If viewMode is TRIP: Source=Farmer, Dest=Buyer
    const navSource = (isPreview && viewMode === 'TRIP') ? deal.pickupLocation : driverLocation;
    const navDest = (isPreview && viewMode === 'TRIP') ? deal.dropLocation : (isToPickup ? deal.pickupLocation : deal.dropLocation);

    useEffect(() => {
        if (!navSource || !navDest) return;

        const fetchRoute = async () => {
            try {
                // Throttle check could be added here, but relying on React's diffing for now
                const url = `https://router.project-osrm.org/route/v1/driving/${navSource.lng},${navSource.lat};${navDest.lng},${navDest.lat}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.routes && data.routes[0]) {
                    const coords = data.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
                    setRouteCoords(coords);
                }
            } catch (err) {
                console.error("Error fetching route:", err);
            }
        };

        fetchRoute();
    }, [navSource?.lat, navSource?.lng, navDest?.lat, navDest?.lng]);

    // Construct props for TrackingMap
    // TrackingMap uses 'pickup' prop for Farm Icon and 'drop' prop for House Icon.

    // Phase 1 (To Pickup):
    // We want the Destination (Farmer) to have the Farm Icon. So we pass it as 'pickup'.
    // We don't want a House icon yet. So 'drop' is null.

    // Phase 2 (To Drop):
    // We want the Origin (Farmer) to have the Farm Icon (optional, but good for context). 
    // We want the Destination (Buyer) to have the House Icon. So we pass it as 'drop'.

    const mapPickup = deal.pickupLocation;
    const mapDrop = (isPreview && viewMode === 'TRIP') ? deal.dropLocation : (isToPickup ? null : deal.dropLocation); // Only show drop marker in Phase 2 or Trip View

    // Custom labels
    const pickupLabel = "Pickup (Farmer)";
    const dropLabel = "Drop (Buyer)";

    const [isFullScreen, setIsFullScreen] = useState(false);

    const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

    return (
        <>
            <style>{`
                @keyframes map-in {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-map-in {
                    animation: map-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>

            {/* Placeholder to prevent layout shift when map becomes fixed */}
            <div className={`h-64 rounded-2xl w-full bg-gray-50 border border-gray-100 transition-all duration-300 ${isFullScreen ? 'block' : 'hidden'}`} />

            <div className={`transition-all duration-300 ${isFullScreen
                ? 'fixed inset-0 z-[9999] h-screen w-screen bg-white animate-map-in'
                : 'h-64 rounded-2xl overflow-hidden shadow-inner border border-gray-200 relative z-0'
                }`}>
                <TrackingMap
                    pickup={mapPickup}
                    drop={mapDrop}
                    driver={driverLocation}
                    routeCoords={routeCoords}
                    pickupLabel={pickupLabel}
                    dropLabel={dropLabel}
                    followDriver={true}
                    refreshTrigger={isFullScreen} // Trigger resize when full screen toggles
                    onProgressUpdate={() => { }}
                    onMapReady={() => { }}
                />

                {/* Status Overlay */}
                <div className={`absolute left-4 z-[1001] flex items-center gap-2 ${isFullScreen ? 'top-4' : 'top-2'}`}>
                    <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold border border-gray-100">
                        {isToPickup ? (
                            <span className="text-orange-600 flex items-center gap-2">
                                <i className="fas fa-tractor"></i> {isPreview ? (viewMode === 'PICKUP' ? 'Routing to Pickup' : 'Trip Route') : 'Routing to Pickup'}
                            </span>
                        ) : (
                            <span className="text-blue-600 flex items-center gap-2">
                                <i className="fas fa-home"></i> Routing to Drop
                            </span>
                        )}
                    </div>

                    {/* View Mode Toggle (Only in Preview) */}
                    {isPreview && (
                        <div className="flex bg-white/90 backdrop-blur p-0.5 rounded-lg shadow-sm border border-gray-100">
                            <button
                                onClick={() => setViewMode('PICKUP')}
                                className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tight transition-all ${viewMode === 'PICKUP' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                To Pickup
                            </button>
                            <button
                                onClick={() => setViewMode('TRIP')}
                                className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tight transition-all ${viewMode === 'TRIP' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                Trip
                            </button>
                        </div>
                    )}
                </div>

                {/* Full Screen Toggle Button (Only show when NOT in full screen) */}
                {!isFullScreen && (
                    <button
                        onClick={toggleFullScreen}
                        className="absolute top-2 right-2 z-[1001] bg-white/90 backdrop-blur w-8 h-8 rounded-lg shadow-sm border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-white hover:scale-105 transition-all"
                    >
                        <i className="fas fa-expand"></i>
                    </button>
                )}

                {/* Back / Close Button (Only in Full Screen) */}
                {isFullScreen && (
                    <button
                        onClick={() => setIsFullScreen(false)}
                        className="absolute top-4 right-4 z-[1001] bg-black text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 text-sm"
                    >
                        <i className="fas fa-arrow-left"></i>
                        Back to Deliveries
                    </button>
                )}
            </div>
        </>
    );
};

export default TransporterTrackingMap;
