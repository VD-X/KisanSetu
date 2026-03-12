import React, { useEffect, useState } from 'react';
import { adminService } from '../../../services/adminService';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, MapPin, Navigation, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

// Fix for default markers in React Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const TransporterIcon = L.divIcon({
    html: `<div class="p-2 bg-emerald-600 rounded-full border-4 border-white shadow-xl text-white">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <rect x="1" y="3" width="15" height="13"></rect>
               <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
               <circle cx="5.5" cy="18.5" r="2.5"></circle>
               <circle cx="18.5" cy="18.5" r="2.5"></circle>
             </svg>
           </div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

const PickupIcon = L.divIcon({
    html: `<div class="p-1.5 bg-blue-500 rounded-lg border-2 border-white shadow-lg text-white">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
               <circle cx="12" cy="10" r="3"></circle>
             </svg>
           </div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

const DropIcon = L.divIcon({
    html: `<div class="p-1.5 bg-orange-500 rounded-lg border-2 border-white shadow-lg text-white">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
               <polyline points="9 22 9 12 15 12 15 22"></polyline>
             </svg>
           </div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

const MapRecenter = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center]);
    return null;
};

const DeliveryTracking: React.FC = () => {
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

    const loadDeliveries = async () => {
        try {
            const res = await adminService.getOrders({ status: 'IN_DELIVERY' });
            const inDelivery = (res.orders || res).filter((o: any) => o.delivery);
            setDeliveries(inDelivery);
            if (inDelivery.length > 0 && !selectedDelivery) setSelectedDelivery(inDelivery[0]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDeliveries();
        const interval = setInterval(loadDeliveries, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="h-[600px] bg-gray-100 rounded-3xl animate-pulse flex items-center justify-center text-gray-400 font-bold">Initializing Maps...</div>;

    const currentPosition: [number, number] = selectedDelivery?.delivery?.currentLocation?.lat
        ? [selectedDelivery.delivery.currentLocation.lat, selectedDelivery.delivery.currentLocation.lng]
        : [20.5937, 78.9629]; // Default to center of India

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
            {/* Sidebar List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-50">
                    <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-emerald-500" />
                        Live Logistics
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{deliveries.length} Active Deliveries</p>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 p-3">
                    {deliveries.length === 0 ? (
                        <div className="py-20 text-center space-y-3">
                            <Truck className="w-12 h-12 text-gray-200 mx-auto" />
                            <p className="text-sm font-bold text-gray-400 italic px-8">No active deliveries being tracked right now.</p>
                        </div>
                    ) : deliveries.map((d) => (
                        <div
                            key={d.id}
                            onClick={() => setSelectedDelivery(d)}
                            className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${selectedDelivery?.id === d.id ? 'bg-emerald-50 border-emerald-500/20' : 'hover:bg-gray-50 border-transparent'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-black text-gray-900">Ord #{d.id.slice(-6).toUpperCase()}</p>
                                <span className="text-[9px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-full shadow-sm border border-emerald-100 uppercase">{d.delivery.status}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-sm">
                                    {d.listing?.crop?.icon || '🌾'}
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-gray-800">{d.listing?.crop?.name} ({d.quantity} {d.unit})</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase truncate max-w-[150px]">{d.delivery.transporter?.name || 'Assigned Transporter'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Map View */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
                <MapContainer center={currentPosition} zoom={7} className="w-full h-full z-10">
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {selectedDelivery && (
                        <>
                            <MapRecenter center={currentPosition} />

                            {/* Transporter Marker */}
                            <Marker position={currentPosition} icon={TransporterIcon}>
                                <Popup>
                                    <div className="font-bold text-xs">
                                        Active Delivery: #{selectedDelivery.id.slice(-6)}<br />
                                        Status: {selectedDelivery.delivery.status}
                                    </div>
                                </Popup>
                            </Marker>

                            {/* Pickup Marker */}
                            {selectedDelivery.delivery.pickupLocation && (
                                <Marker position={[selectedDelivery.delivery.pickupLocation.lat, selectedDelivery.delivery.pickupLocation.lng]} icon={PickupIcon}>
                                    <Popup><span className="text-xs font-bold">Pickup: {selectedDelivery.delivery.pickupLocation.address}</span></Popup>
                                </Marker>
                            )}

                            {/* Drop Marker */}
                            {selectedDelivery.delivery.dropLocation && (
                                <Marker position={[selectedDelivery.delivery.dropLocation.lat, selectedDelivery.delivery.dropLocation.lng]} icon={DropIcon}>
                                    <Popup><span className="text-xs font-bold">Drop: {selectedDelivery.delivery.dropLocation.address}</span></Popup>
                                </Marker>
                            )}

                            {/* Path */}
                            {selectedDelivery.delivery.pickupLocation && selectedDelivery.delivery.dropLocation && (
                                <Polyline
                                    positions={[
                                        [selectedDelivery.delivery.pickupLocation.lat, selectedDelivery.delivery.pickupLocation.lng],
                                        [selectedDelivery.delivery.dropLocation.lat, selectedDelivery.delivery.dropLocation.lng]
                                    ]}
                                    color="#10B981"
                                    weight={3}
                                    dashArray="10, 10"
                                    opacity={0.6}
                                />
                            )}
                        </>
                    )}
                </MapContainer>

                {/* Overlays */}
                {selectedDelivery && (
                    <div className="absolute bottom-6 left-6 right-6 z-20 flex gap-4">
                        <div className="flex-1 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-100 flex items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                                    <Truck className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">In Transit to Destination</p>
                                    <h4 className="text-lg font-black text-gray-900 uppercase truncate">#{selectedDelivery.id.slice(-8)}</h4>
                                </div>
                            </div>
                            <div className="flex gap-8">
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Estimated Arrival</p>
                                    <p className="text-sm font-black text-emerald-600 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {selectedDelivery.delivery.eta || 'Calculated'}</p>
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Security Code</p>
                                    <p className="text-sm font-black text-gray-900 flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> {selectedDelivery.delivery.deliveryCode || '****'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Legend Overlay */}
                <div className="absolute top-6 right-6 z-20 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-xl border border-gray-100 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Transporter</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Pickup Location</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-orange-500 rounded-sm" />
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Destination</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeliveryTracking;
