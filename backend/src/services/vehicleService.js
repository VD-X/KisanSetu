
// Standard vehicle types and their common variations/aliases
const VEHICLE_TYPE_MAPPING = {
    'Bike Delivery': ['bike', 'motorcycle', 'scooter', 'bike delivery', 'mini'],
    'Auto Rickshaw': ['auto', 'auto rickshaw', 'rikshaw', 'three-wheeler'],
    'Pickup Truck': ['pickup', 'pickup truck', 'small truck', 'mini truck', 'tempo'],
    '4-Wheeler Truck': ['truck', '4-wheeler truck', 'lorry', 'heavy truck', 'truck delivery'],
    'Tempo': ['tempo', 'mini truck', 'pickup', 'small truck']
};

/**
 * Normalizes a vehicle type name to the standard set used in the application.
 * @param {string} vehicleName - The input vehicle name to normalize.
 * @returns {string} The normalized vehicle name or the original if no match found.
 */
const normalizeVehicleType = (vehicleName) => {
    if (!vehicleName) return null;

    const lowerVehicleName = vehicleName.toLowerCase().trim();

    // Find matching vehicle type
    for (const [frontendName, variations] of Object.entries(VEHICLE_TYPE_MAPPING)) {
        if (variations.some(variation => lowerVehicleName.includes(variation) || variation.includes(lowerVehicleName))) {
            return frontendName;
        }
    }

    // Default to the original name if no match found
    return vehicleName;
};

/**
 * Generates a consistent room name for a vehicle type.
 * @param {string} vehicleType - The vehicle type (e.g., "Pickup Truck" or "pickup").
 * @returns {string} The normalized room name (e.g., "vehicle-pickup-truck").
 */
const getVehicleRoomName = (vehicleType) => {
    if (!vehicleType) return null;
    const normalized = normalizeVehicleType(vehicleType);
    return `vehicle-${normalized.toLowerCase().replace(/\s+/g, '-')}`;
};

module.exports = {
    VEHICLE_TYPE_MAPPING,
    normalizeVehicleType,
    getVehicleRoomName
};
