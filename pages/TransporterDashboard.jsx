import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

// Initialize socket only once or inside useEffect if conditional
const socket = io(import.meta.env.VITE_API_URL.replace('/api', ''), { // Socket connects to base URL, not /api
    autoConnect: false // Connect manually when needed
});

const TransporterDashboard = () => {
    const [deliveries, setDeliveries] = useState([]);
    const token = localStorage.getItem("token");

    useEffect(() => {
        // Connect socket on mount
        socket.connect();

        // Fetch available deliveries
        axios
            .get(`${import.meta.env.VITE_API_URL}/delivery-deals/available`, { // Route prefix is /delivery-deals based on app.js
                headers: { Authorization: `Bearer ${token}` }
            })
            .then((res) => setDeliveries(res.data))
            .catch(err => console.error("Error fetching deliveries:", err));

        return () => {
            socket.disconnect();
        };
    }, [token]);

    const acceptDelivery = async (id) => {
        try {
            await axios.post( // Changed from PUT to POST to match route definition
                `${import.meta.env.VITE_API_URL}/delivery-deals/${id}/accept`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Remove from list or update status locally
            setDeliveries(prev => prev.filter(d => d._id !== id && d.id !== id));
            alert("Delivery Accepted!");

            // Start tracking
            if (navigator.geolocation) {
                navigator.geolocation.watchPosition((pos) => {
                    socket.emit("sendLocation", {
                        deliveryId: id,
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                }, (err) => console.error(err), { enableHighAccuracy: true });
            }
        } catch (error) {
            console.error("Accept failed:", error);
            alert("Failed to accept delivery");
        }
    };

    const markDelivered = async (id) => {
        try {
            await axios.put(
                `${import.meta.env.VITE_API_URL}/delivery-deals/${id}/status`, // Using generalized status endpoint
                { status: 'DELIVERED' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("Marked as Delivered");
        } catch (error) {
            console.error("Update failed:", error);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Transporter Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deliveries.length === 0 ? (
                    <p className="text-gray-500">No active deliveries available.</p>
                ) : (
                    deliveries.map((delivery) => (
                        <div key={delivery._id || delivery.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                            <div className="border-b border-gray-100 pb-4 mb-4">
                                <h3 className="text-lg font-bold text-green-700">Delivery #{delivery.orderId.substring(0, 8)}...</h3>
                                <p className="text-sm text-gray-500">Distance: <span className="font-medium text-gray-800">{delivery.distance} km</span></p>
                            </div>

                            <div className="mb-4 space-y-2">
                                <p className="text-gray-600"><span className="font-semibold">From:</span> {delivery.pickupLocation.address || "Pickup Point"}</p>
                                <p className="text-gray-600"><span className="font-semibold">To:</span> {delivery.dropLocation.address || "Drop Point"}</p>
                            </div>

                            <div className="flex justify-between items-center mt-4">
                                <span className="text-xl font-bold text-gray-800">₹{delivery.price}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => acceptDelivery(delivery._id || delivery.id)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                                    >
                                        Accept
                                    </button>
                                    {/* Only show 'Mark Delivered' if already accepted in a real scenario, but keeping simpler for now */}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TransporterDashboard;
