import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

// Fix for default Leaflet icons in Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapView = ({ pickup, drop, setRouteInfo }) => {
    const mapRef = useRef(null);
    const routeLayerRef = useRef(null);
    const pickupMarkerRef = useRef(null);
    const dropMarkerRef = useRef(null);

    // Recreate map on pickup/drop change to ensure fresh state
    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
        mapRef.current = L.map("map").setView([20.5937, 78.9629], 5);
        L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }
        ).addTo(mapRef.current);
    }, [pickup, drop]);

    // Update markers
    useEffect(() => {
        if (!mapRef.current) return;
        // Remove old markers
        if (pickupMarkerRef.current) {
            mapRef.current.removeLayer(pickupMarkerRef.current);
            pickupMarkerRef.current = null;
        }
        if (dropMarkerRef.current) {
            mapRef.current.removeLayer(dropMarkerRef.current);
            dropMarkerRef.current = null;
        }
        // Add new markers
        if (pickup) {
            pickupMarkerRef.current = L.marker(pickup).addTo(mapRef.current).bindPopup(`Pickup: ${pickup.lat}, ${pickup.lng}`).openPopup();
        }
        if (drop) {
            dropMarkerRef.current = L.marker(drop).addTo(mapRef.current).bindPopup(`Drop: ${drop.lat}, ${drop.lng}`);
        }
    }, [pickup, drop]);


    useEffect(() => {
        if (!pickup || !drop || !mapRef.current) return;
        const fetchRoute = async () => {
            try {
                const { data } = await axios.post(
                    `${import.meta.env.VITE_API_URL}/route`,
                    { pickup, drop }
                );
                if (routeLayerRef.current) {
                    mapRef.current.removeLayer(routeLayerRef.current);
                    routeLayerRef.current = null;
                }
                routeLayerRef.current = L.geoJSON(data.geometry, {
                    style: { color: '#16a34a', weight: 5, opacity: 0.9 }
                }).addTo(mapRef.current);
                mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
                if (setRouteInfo) {
                    setRouteInfo({
                        distance: data.distance,
                        duration: data.duration
                    });
                }
            } catch (error) {
                console.error("Route Fetch Error:", error);
            }
        };
        fetchRoute();
    }, [pickup, drop, setRouteInfo]);

    return <div id="map" style={{ height: "400px", width: "100%", borderRadius: "12px" }} />;
};

export default MapView;
