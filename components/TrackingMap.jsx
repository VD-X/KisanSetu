import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue - use unpkg CDN which is more reliable
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons with error handling
const createIcon = (iconUrl, iconSize, iconAnchor, popupAnchor = [0, 0]) => {
    const icon = new L.Icon({
        iconUrl,
        iconSize,
        iconAnchor,
        popupAnchor,
        errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNGRkY0RjQiIHN0cm9rZT0iI0U1RTdFQiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik0xMiA4VjEyTTEyIDE2SDEyLjAxIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPg=='
    });
    // Add error handler
    const img = new Image();
    img.onerror = () => {
        console.warn(`Failed to load icon: ${iconUrl}`);
    };
    img.src = iconUrl;
    return icon;
};

const truckIcon = createIcon(
    'https://cdn-icons-png.flaticon.com/512/7541/7541900.png',
    [40, 40],
    [20, 20],
    [0, -20]
);

const pickupIcon = createIcon(
    'https://cdn-icons-png.flaticon.com/512/1673/1673221.png',
    [35, 35],
    [17, 35]
);

const dropIcon = createIcon(
    'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    [35, 35],
    [17, 35]
);

// Component to show live driver marker at actual position with smooth animations
const LiveDriverMarker = ({ position, follow }) => {
    const map = useMap();
    const markerRef = useRef(null);
    const previousPositionRef = useRef(null);

    useEffect(() => {
        if (!map || !position) {
            console.log('LiveDriverMarker: No map or position', { map: !!map, position });
            return;
        }

        console.log('LiveDriverMarker: Creating marker at', position);

        // Create truck icon with better visibility
        const truckIcon = L.divIcon({
            html: '<div style="font-size: 28px; background: white; border: 2px solid #16a34a; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); animation: pulse 2s infinite;">🚚</div>',
            className: "",
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        // Create marker at driver position
        const marker = L.marker([position.lat, position.lng], {
            icon: truckIcon,
            zIndexOffset: 1000
        }).addTo(map);

        markerRef.current = marker;
        previousPositionRef.current = position;
        console.log('LiveDriverMarker: Marker added to map');

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);

        // Cleanup
        return () => {
            if (markerRef.current) {
                map.removeLayer(markerRef.current);
                markerRef.current = null;
                console.log('LiveDriverMarker: Marker removed');
            }
            if (style.parentNode) {
                document.head.removeChild(style);
            }
        };
    }, [map]);

    // Update marker position with smooth animation
    useEffect(() => {
        if (markerRef.current && position) {
            const prevPos = previousPositionRef.current;

            // Only animate if position actually changed
            if (!prevPos || prevPos.lat !== position.lat || prevPos.lng !== position.lng) {
                // Smooth animation to new position
                markerRef.current.setLatLng([position.lat, position.lng]);

                // Auto-zoom and follow logic
                if (follow) {
                    const currentZoom = map.getZoom();
                    const targetZoom = Math.max(currentZoom, 18); // Stay at current high zoom or go to 18

                    map.setView([position.lat, position.lng], targetZoom, {
                        animate: true,
                        duration: 1.5,
                        easeLinearity: 0.25
                    });
                }

                previousPositionRef.current = position;
                console.log('LiveDriverMarker: Position updated to', position);
            }
        }
    }, [position, follow, map]);

    return null;
};

const FitRouteBounds = ({ routeCoords }) => {
    const map = useMap();
    useEffect(() => {
        if (!routeCoords || routeCoords.length < 2) return;
        const bounds = L.latLngBounds(routeCoords.map(coord => [coord[0], coord[1]]));
        map.fitBounds(bounds, { padding: [60, 60] });
    }, [map, routeCoords]);
    return null;
};

const hasValidCoords = (loc) =>
    loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' &&
    !Number.isNaN(loc.lat) && !Number.isNaN(loc.lng);

// When pickup and drop have the same coords, offset pickup slightly so both markers are visible
const OFFSET_SAME_COORDS = 0.002; // ~200m
function usePickupDropCoords(pickup, drop) {
    return React.useMemo(() => {
        if (!hasValidCoords(pickup) || !hasValidCoords(drop)) {
            return { pickupCoords: pickup, dropCoords: drop };
        }
        const same = pickup.lat === drop.lat && pickup.lng === drop.lng;
        if (!same) {
            return { pickupCoords: pickup, dropCoords: drop };
        }
        return {
            pickupCoords: { ...pickup, lat: pickup.lat + OFFSET_SAME_COORDS, lng: pickup.lng + OFFSET_SAME_COORDS },
            dropCoords: drop
        };
    }, [pickup, drop]);
}

const TrackingMap = ({ pickup, drop, driver, routeCoords, followDriver, onProgressUpdate, onMapReady, pickupLabel, dropLabel, refreshTrigger }) => {
    const [mapBounds, setMapBounds] = useState(null);
    const [mapInstance, setMapInstance] = useState(null);
    const hasCoords = (location) => {
        return location && typeof location.lat === 'number' && typeof location.lng === 'number' &&
            !Number.isNaN(location.lat) && !Number.isNaN(location.lng);
    };
    const { pickupCoords, dropCoords } = usePickupDropCoords(pickup, drop);
    const pickupReady = hasCoords(pickupCoords);
    const dropReady = hasCoords(dropCoords);
    const driverReady = hasCoords(driver);
    const safeRouteCoords = Array.isArray(routeCoords)
        ? routeCoords.filter((coord) => Array.isArray(coord) &&
            coord.length === 2 &&
            typeof coord[0] === 'number' &&
            typeof coord[1] === 'number' &&
            !Number.isNaN(coord[0]) &&
            !Number.isNaN(coord[1]))
        : [];

    // Debug: Log driver readiness
    console.log('TrackingMap Debug:', {
        driver,
        driverReady,
        pickupReady,
        dropReady,
        routeCoords: routeCoords.length
    });

    // Map ready handler
    const MapReadyHandler = () => {
        const map = useMap();
        useEffect(() => {
            if (!mapInstance && map) {
                setMapInstance(map);
                if (onMapReady) {
                    onMapReady();
                }
            }
        }, [map, mapInstance, onMapReady]);
        return null;
    };

    // Resize handler to fix map rendering issues when container changes size (e.g. full screen)
    const ResizeHandler = ({ trigger }) => {
        const map = useMap();
        useEffect(() => {
            if (map) {
                setTimeout(() => {
                    map.invalidateSize();
                }, 300); // 300ms delay to match transition duration
            }
        }, [trigger, map]);
        return null;
    };

    useEffect(() => {
        if (pickupReady && dropReady) {
            const bounds = L.latLngBounds([
                [pickupCoords.lat, pickupCoords.lng],
                [dropCoords.lat, dropCoords.lng]
            ]);
            setMapBounds(bounds);
        } else {
            setMapBounds(null);
        }
    }, [pickupCoords, dropCoords, pickupReady, dropReady]);

    const fallbackCenter = [20.5937, 78.9629];
    const center = driverReady ? [driver.lat, driver.lng] : pickupReady ? [pickupCoords.lat, pickupCoords.lng] : fallbackCenter;

    return (
        <MapContainer
            bounds={mapBounds}
            center={center}
            zoom={driverReady ? 17 : (pickupReady || dropReady ? 14 : 5)}
            minZoom={3}
            maxZoom={20}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
        >
            <MapReadyHandler />
            <ResizeHandler trigger={refreshTrigger} />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                maxNativeZoom={18}
                maxZoom={20}
            />

            <FitRouteBounds routeCoords={safeRouteCoords} />

            {/* Pickup Marker (Farmer) */}
            {pickupReady && (
                <Marker position={[pickupCoords.lat, pickupCoords.lng]} icon={pickupIcon}>
                    <Popup>{pickupLabel || `Pickup (Farmer): ${pickup?.address || 'Farm'}`}</Popup>
                </Marker>
            )}

            {/* Drop Marker (Buyer delivery) */}
            {dropReady && (
                <Marker position={[dropCoords.lat, dropCoords.lng]} icon={dropIcon}>
                    <Popup>{dropLabel || `Drop (Your location): ${drop?.address || 'Delivery address'}`}</Popup>
                </Marker>
            )}

            {/* Driver Marker - Always show if driver position is available */}
            {driverReady && <LiveDriverMarker key="driver" position={driver} follow={followDriver} />}

            {/* Optimized route: Farmer (pickup) → Buyer (drop) - for transporter */}
            {safeRouteCoords.length > 0 && (
                <>
                    {/* Slightly thicker outline for visibility */}
                    <Polyline
                        positions={safeRouteCoords}
                        color="#1e40af"
                        weight={8}
                        opacity={0.35}
                    />
                    <Polyline
                        positions={safeRouteCoords}
                        color="#16a34a"
                        weight={5}
                        opacity={1.0}
                    />
                </>
            )}
        </MapContainer>
    );
};

export default TrackingMap;
