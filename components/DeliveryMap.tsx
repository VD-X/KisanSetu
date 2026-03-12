import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import L from 'leaflet';
import { io } from 'socket.io-client';

interface DeliveryMapProps {
    pickup: { lat: number; lng: number; address: string };
    drop: { lat: number; lng: number; address: string };
    current?: { lat: number; lng: number };
    deliveryId?: string; // Add deliveryId prop for live tracking
    isTransporter?: boolean; // Flag to enable location broadcasting
}

// Component to fit map bounds
const FitBounds: React.FC<{ bounds: any }> = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    }, [bounds, map]);
    return null;
};

const DeliveryMap: React.FC<DeliveryMapProps> = ({ pickup, drop, current, deliveryId, isTransporter = false }) => {
    const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(current || null);
    const [socket, setSocket] = useState<any>(null);
    const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socketBase = rawBaseUrl.endsWith('/api') ? rawBaseUrl.slice(0, -4) : rawBaseUrl.replace(/\/+$/, '');

    // Default Guntur coordinates if 0,0 provided (mock fallback)
    const pLat = pickup.lat || 16.3067;
    const pLng = pickup.lng || 80.4365;
    const dLat = drop.lat || 16.5062; // Vijayawada approx
    const dLng = drop.lng || 80.6480;

    const pickupPosition: [number, number] = [pLat, pLng];
    const dropPosition: [number, number] = [dLat, dLng];
    const currentPosition: [number, number] | null = liveLocation ? [liveLocation.lat, liveLocation.lng] : null;

    const bounds = L.latLngBounds([pickupPosition, dropPosition]);

    // Initialize Socket connection for live tracking
    useEffect(() => {
        if (!deliveryId) return;

        const newSocket = io(socketBase);
        setSocket(newSocket);

        newSocket.emit('join-tracking-room', deliveryId);

        newSocket.on('location-updated', (data: { lat: number; lng: number }) => {
            console.log('Live location update:', data);
            setLiveLocation(data);
        });

        return () => {
            newSocket.emit('leave-tracking-room', deliveryId);
            newSocket.disconnect();
        };
    }, [deliveryId]);

    // Transporter: Broadcast location
    useEffect(() => {
        if (!isTransporter || !deliveryId || !socket) return;

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Update local state immediately
                setLiveLocation({ lat: latitude, lng: longitude });
                // Broadcast to room
                socket.emit('update-location', {
                    deliveryId,
                    lat: latitude,
                    lng: longitude
                });
            },
            (error) => console.error('Error watching position:', error),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [isTransporter, deliveryId, socket]);


    const truckIcon = new L.DivIcon({
        className: 'custom-icon',
        html: `<div style="background-color: white; padding: 5px; border-radius: 50%; border: 2px solid #16a34a; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-truck text-green-600"></i></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    const houseIcon = new L.DivIcon({
        className: 'custom-icon',
        html: `<div style="background-color: white; padding: 5px; border-radius: 50%; border: 2px solid #ef4444; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-home text-red-500"></i></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    const farmIcon = new L.DivIcon({
        className: 'custom-icon',
        html: `<div style="background-color: white; padding: 5px; border-radius: 50%; border: 2px solid #ea580c; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-tractor text-orange-600"></i></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });


    return (
        <div className="h-64 w-full rounded-2xl overflow-hidden shadow-inner border border-gray-200 relative z-0">
            <MapContainer
                center={pickupPosition}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                dragging={false} // Static feel, interactive via expansion if needed
                scrollWheelZoom={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    maxNativeZoom={18}
                    maxZoom={20}
                />

                <Marker position={pickupPosition} icon={farmIcon}>
                    <Popup>Pickup: {pickup.address}</Popup>
                </Marker>

                <Marker position={dropPosition} icon={houseIcon}>
                    <Popup>Drop: {drop.address}</Popup>
                </Marker>

                {currentPosition && (
                    <Marker position={currentPosition} icon={truckIcon} zIndexOffset={100}>
                        <Popup>In Transit</Popup>
                    </Marker>
                )}

                <Polyline positions={[pickupPosition, dropPosition]} color="#16a34a" weight={4} dashArray="10, 10" opacity={0.6} />

                <FitBounds bounds={bounds} />
            </MapContainer>

            {/* Overlay Gradient for seamless integration */}
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-50/50 to-transparent pointer-events-none z-[400]"></div>
        </div>
    );
};

export default DeliveryMap;
