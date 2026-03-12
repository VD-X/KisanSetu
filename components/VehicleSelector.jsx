import React from "react";
import { Truck } from "lucide-react";

const vehicles = [
    { name: "Mini", base: 30, perKm: 10, description: "Small goods up to 500kg" },
    { name: "Pickup", base: 50, perKm: 15, description: "Standard pickup up to 1.5 tons" },
    { name: "Truck", base: 80, perKm: 22, description: "Heavy duty up to 3 tons" }
];

const VehicleSelector = ({ distance, duration, onSelect, selectedVehicle }) => {
    if (!distance) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-4">
            {vehicles.map((vehicle) => {
                const price = vehicle.base + distance * vehicle.perKm;
                const eta = Math.round(duration);
                const isSelected = selectedVehicle === vehicle.name;

                return (
                    <div
                        key={vehicle.name}
                        className={`border rounded-xl p-4 flex flex-col items-center cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-gray-200 bg-white'
                            }`}
                        onClick={() =>
                            onSelect({
                                name: vehicle.name,
                                price: parseFloat(price.toFixed(2))
                            })
                        }
                    >
                        <div className="bg-gray-100 p-3 rounded-full mb-3">
                            <Truck className={isSelected ? "text-green-600" : "text-gray-600"} size={24} />
                        </div>

                        <h3 className="font-bold text-gray-800 text-lg">{vehicle.name}</h3>
                        <p className="text-xs text-gray-500 text-center mb-2">{vehicle.description}</p>

                        <div className="flex justify-between w-full mt-auto pt-2 border-t border-gray-100 text-sm">
                            <span className="text-gray-600">ETA: {eta} min</span>
                            <span className="font-bold text-green-700">₹{Math.round(price)}</span>
                        </div>

                        <button
                            className={`mt-3 w-full py-2 rounded-lg text-sm font-semibold transition-colors ${isSelected ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {isSelected ? 'Selected' : 'Select'}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default VehicleSelector;
