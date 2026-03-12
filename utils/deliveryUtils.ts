/**
 * Delivery & Distance Calculation Utilities
 * Modern delivery calculation functions for iOS-style UI
 */

/**
 * Calculate distance between two geographical points using Haversine formula
 * @param lat1 - Latitude of first point (degrees)
 * @param lon1 - Longitude of first point (degrees)
 * @param lat2 - Latitude of second point (degrees)
 * @param lon2 - Longitude of second point (degrees)
 * @returns Distance in kilometers
 */
export const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Calculate delivery fee based on vehicle type, distance, and load
 * @param distance - Distance in kilometers
 * @param weight - Weight in kilograms
 * @param basePrice - Base price of the vehicle
 * @param perKmPrice - Price per kilometer
 * @param perKgPrice - Price per kilogram
 * @param minPrice - Minimum price
 * @returns Calculated delivery fee
 */
export const calculateDeliveryFee = (
    distance: number,
    weight: number,
    basePrice: number,
    perKmPrice: number,
    perKgPrice: number,
    minPrice: number
): number => {
    const distanceCharge = distance * perKmPrice;
    const weightCharge = weight * perKgPrice;
    const totalCharge = Math.max(basePrice, distanceCharge + weightCharge);
    return Math.max(totalCharge, minPrice);
};

/**
 * Calculate estimated time of arrival based on distance and vehicle type
 * @param distance - Distance in kilometers
 * @param weight - Total weight in kilograms
 * @param vehicleCapacity - Vehicle capacity in kilograms
 * @param avgSpeedKmh - Average speed in km/h (default: 40)
 * @returns Estimated time in minutes
 */
export const calculateETA = (
    distance: number,
    weight: number,
    vehicleCapacity: number,
    avgSpeedKmh: number = 40
): number => {
    const isOverloaded = weight > vehicleCapacity;
    const speedAdjustment = isOverloaded ? 0.8 : 1.0; // Reduce speed if overloaded
    const timeInHours = distance / (avgSpeedKmh * speedAdjustment);
    return Math.round(timeInHours * 60) + 5; // Add 5 minutes buffer
};

/**
 * Check if a vehicle can accommodate the weight
 * @param weight - Total weight in kilograms
 * @param capacity - Vehicle capacity in kilograms
 * @returns True if vehicle can accommodate, false otherwise
 */
export const isVehicleCapacitySufficient = (
    weight: number,
    capacity: number
): boolean => {
    return weight <= capacity;
};

/**
 * Get weight warning status
 * @param weight - Total weight in kilograms
 * @param capacity - Vehicle capacity in kilograms
 * @returns Warning status: null (ok), 'warning' (80-100%), 'critical' (>100%)
 */
export const getWeightWarningStatus = (
    weight: number,
    capacity: number
): null | 'warning' | 'critical' => {
    const percentage = (weight / capacity) * 100;
    if (percentage > 100) return 'critical';
    if (percentage > 80) return 'warning';
    return null;
};

/**
 * Format cost as Indian Rupees
 * @param amount - Amount in rupees
 * @returns Formatted string (e.g., "₹500", "₹1,234.50")
 */
export const formatCost = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;
};

/**
 * Format distance with appropriate precision
 * @param distance - Distance in kilometers
 * @returns Formatted string (e.g., "42.5 km")
 */
export const formatDistance = (distance: number): string => {
    return `${distance.toFixed(1)} km`;
};

/**
 * Get cost range from multiple vehicles
 * @param vehicles - Array of vehicles with pricing info
 * @param distance - Distance in kilometers
 * @param weight - Total weight in kilograms
 * @returns Object with min and max costs
 */
export const getCostRange = (
    vehicles: Array<{
        basePrice: number;
        perKmPrice: number;
        perKgPrice: number;
        minPrice: number;
    }>,
    distance: number,
    weight: number
): { min: number; max: number } => {
    const fees = vehicles.map(v =>
        calculateDeliveryFee(
            distance,
            weight,
            v.basePrice,
            v.perKmPrice,
            v.perKgPrice,
            v.minPrice
        )
    );

    return {
        min: Math.min(...fees),
        max: Math.max(...fees),
    };
};

/**
 * Estimate total cost including taxes and fees
 * @param deliveryFee - Base delivery fee
 * @param subtotal - Subtotal of goods
 * @param taxRate - Tax rate (default: 0.05 or 5%)
 * @param handlingFeePercent - Handling fee percentage (default: 2%)
 * @returns Object with breakdown
 */
export const calculateTotalCost = (
    deliveryFee: number,
    subtotal: number = 0,
    taxRate: number = 0.05,
    handlingFeePercent: number = 2
): {
    subtotal: number;
    taxes: number;
    handlingFee: number;
    deliveryFee: number;
    total: number;
} => {
    const taxes = subtotal * taxRate;
    const handlingFee = (subtotal + deliveryFee) * (handlingFeePercent / 100);
    const total = subtotal + taxes + handlingFee + deliveryFee;

    return { subtotal, taxes, handlingFee, deliveryFee, total };
};

/**
 * Sort vehicles by price
 * @param vehicles - Array of vehicles
 * @param distance - Distance in kilometers
 * @param weight - Total weight in kilograms
 * @returns Sorted array (ascending)
 */
export const sortVehiclesByPrice = (
    vehicles: Array<{
        id: string;
        basePrice: number;
        perKmPrice: number;
        perKgPrice: number;
        minPrice: number;
    }>,
    distance: number,
    weight: number
) => {
    return [...vehicles].sort((a, b) => {
        const feeA = calculateDeliveryFee(
            distance,
            weight,
            a.basePrice,
            a.perKmPrice,
            a.perKgPrice,
            a.minPrice
        );
        const feeB = calculateDeliveryFee(
            distance,
            weight,
            b.basePrice,
            b.perKmPrice,
            b.perKgPrice,
            b.minPrice
        );
        return feeA - feeB;
    });
};

/**
 * Filter vehicles by capacity
 * @param vehicles - Array of vehicles
 * @param weight - Total weight in kilograms
 * @returns Filtered array of capable vehicles
 */
export const filterVehiclesByCapacity = (
    vehicles: Array<{ id: string; capacity: number }>,
    weight: number
) => {
    return vehicles.filter(v => v.capacity >= weight);
};

/**
 * Get recommended vehicle based on weight and cost
 * @param vehicles - Array of vehicles
 * @param distance - Distance in kilometers
 * @param weight - Total weight in kilograms
 * @returns Recommended vehicle ID or null
 */
export const getRecommendedVehicle = (
    vehicles: Array<{
        id: string;
        capacity: number;
        basePrice: number;
        perKmPrice: number;
        perKgPrice: number;
        minPrice: number;
        popular?: boolean;
    }>,
    distance: number,
    weight: number
): string | null => {
    // Filter vehicles that can accommodate the weight
    const capable = vehicles.filter(v => v.capacity >= weight);
    if (capable.length === 0) return null;

    // Prioritize popular vehicles first
    const popular = capable.find(v => v.popular);
    if (popular) return popular.id;

    // Otherwise, return cheapest option
    const sorted = sortVehiclesByPrice(capable, distance, weight);
    return sorted[0]?.id || null;
};

/**
 * Validate location data
 * @param location - Location object with address and coordinates
 * @returns True if location is valid, false otherwise
 */
export const isLocationValid = (location: {
    latitude: number | null;
    longitude: number | null;
    address: string;
    district: string;
    state: string;
}): boolean => {
    return (
        location.latitude !== null &&
        location.longitude !== null &&
        location.address.trim().length > 0 &&
        location.district.trim().length > 0 &&
        location.state.trim().length > 0 &&
        location.latitude >= -90 &&
        location.latitude <= 90 &&
        location.longitude >= -180 &&
        location.longitude <= 180
    );
};

/**
 * Format coordinates display
 * @param latitude - Latitude value
 * @param longitude - Longitude value
 * @returns Formatted string (e.g., "16.5062°N, 80.6480°E")
 */
export const formatCoordinates = (
    latitude: number,
    longitude: number
): string => {
    const lat = `${Math.abs(latitude).toFixed(4)}°${latitude >= 0 ? 'N' : 'S'}`;
    const lng = `${Math.abs(longitude).toFixed(4)}°${longitude >= 0 ? 'E' : 'W'}`;
    return `${lat}, ${lng}`;
};

/**
 * Calculate savings compared to maximum price
 * @param selectedPrice - Selected vehicle price
 * @param maxPrice - Maximum available price
 * @returns Savings percentage
 */
export const calculateSavings = (
    selectedPrice: number,
    maxPrice: number
): number => {
    if (maxPrice === 0) return 0;
    return Math.round(((maxPrice - selectedPrice) / maxPrice) * 100);
};

/**
 * Check if delivery can be completed same day
 * @param eta - Estimated time in minutes
 * @param currentHour - Current hour (0-23, default is current time)
 * @returns True if can be completed same day
 */
export const canDeliverSameDay = (
    eta: number,
    currentHour: number = new Date().getHours()
): boolean => {
    const deliveryHour = currentHour + Math.ceil(eta / 60);
    return deliveryHour < 22; // Assume last delivery at 10 PM
};
