import { useState } from "react";
import axios from "axios";
import MapView from "../components/MapView";
import VehicleSelector from "../components/VehicleSelector";
import { useNavigate } from "react-router-dom";

const ArrangeDelivery = () => {
    const [pickup, setPickup] = useState(null);
    const [drop, setDrop] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const navigate = useNavigate();

    const confirmBooking = async () => {
        try {
            const token = localStorage.getItem("token");

            // Use import.meta.env for Vite
            const { data } = await axios.post(
                `${import.meta.env.VITE_API_URL}/deliveries/create`, // Assuming /create endpoint based on earlier context
                {
                    pickupLocation: { lat: parseFloat(pickup.lat), lng: parseFloat(pickup.lng), address: "Manual Entry" }, // Adapting to schema
                    dropLocation: { lat: parseFloat(drop.lat), lng: parseFloat(drop.lng), address: "Manual Entry" },
                    distance: routeInfo.distance,
                    estimatedDuration: routeInfo.duration,
                    selectedVehicle: selectedVehicle.name,
                    price: selectedVehicle.price
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            navigate(`/tracking/${data._id || data.id}`);
        } catch (error) {
            console.error("Booking failed:", error);
            alert("Failed to book delivery. Please try again.");
        }
    };

    const handlePickupBlur = (e) => {
        const val = e.target.value;
        if (val.includes(',')) {
            const [lat, lng] = val.split(",").map(c => c.trim());
            if (lat && lng) setPickup({ lat: parseFloat(lat), lng: parseFloat(lng) });
        }
    };

    const handleDropBlur = (e) => {
        const val = e.target.value;
        if (val.includes(',')) {
            const [lat, lng] = val.split(",").map(c => c.trim());
            if (lat && lng) setDrop({ lat: parseFloat(lat), lng: parseFloat(lng) });
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-50">
            <div className="w-full md:w-2/5 p-6 overflow-y-auto bg-white shadow-xl z-10 flex flex-col gap-6">
                <h2 className="text-2xl font-bold text-gray-800">Arrange Delivery</h2>

                <div className="flex flex-col gap-4">
                    <div className="form-control">
                        <label className="label text-sm font-semibold text-gray-600">Pickup Location (Lat, Lng)</label>
                        <input
                            className="input input-bordered w-full bg-gray-50"
                            placeholder="20.5937, 78.9629"
                            onBlur={handlePickupBlur}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label text-sm font-semibold text-gray-600">Drop Location (Lat, Lng)</label>
                        <input
                            className="input input-bordered w-full bg-gray-50"
                            placeholder="19.0760, 72.8777"
                            onBlur={handleDropBlur}
                        />
                    </div>
                </div>

                {routeInfo && (
                    <div className="animate-fade-in-up">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Select Vehicle</h3>
                        <VehicleSelector
                            distance={routeInfo.distance}
                            duration={routeInfo.duration}
                            selectedVehicle={selectedVehicle?.name}
                            onSelect={setSelectedVehicle}
                        />
                    </div>
                )}

                {selectedVehicle && (
                    <button
                        onClick={confirmBooking}
                        className="btn btn-primary w-full mt-4 py-3 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                        Confirm Booking • ₹{selectedVehicle.price}
                    </button>
                )}
            </div>

            <div className="w-full md:w-3/5 h-[50vh] md:h-full">
                <MapView
                    pickup={pickup}
                    drop={drop}
                    setRouteInfo={setRouteInfo}
                />
            </div>
        </div>
    );
};

export default ArrangeDelivery;
