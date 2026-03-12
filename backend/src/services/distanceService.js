const fetch = require('node-fetch');

// In-memory cache for distance calculations
const distanceCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns straight-line distance in kilometers
 * Used as fallback when ORS API fails
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Multiply by 1.3 to approximate road distance from straight-line distance
    return distance * 1.3;
};

const toRad = (degrees) => {
    return degrees * (Math.PI / 180);
};

/**
 * Calculate road distance using OpenRouteService Directions API
 * @param {Object} origin - { lat, lng }
 * @param {Object} destination - { lat, lng }
 * @returns {Promise<Object>} - { distanceKm, durationMinutes, source }
 */
const calculateDistance = async (origin, destination) => {
    try {
        // Validate coordinates
        if (!isValidCoordinate(origin.lat, origin.lng) ||
            !isValidCoordinate(destination.lat, destination.lng)) {
            throw new Error('Invalid coordinates provided');
        }

        // Check cache first
        const cacheKey = `${origin.lat.toFixed(4)}_${origin.lng.toFixed(4)}_${destination.lat.toFixed(4)}_${destination.lng.toFixed(4)}`;
        const cached = distanceCache.get(cacheKey);

        if (cached && Date.now() < cached.expiresAt) {
            console.log('[DistanceService] Returning cached distance');
            return cached.data;
        }

        // Try OpenRouteService API
        const apiKey = process.env.OPENROUTESERVICE_API_KEY;

        if (!apiKey) {
            console.warn('[DistanceService] No ORS API key found, using Haversine fallback');
            return useFallback(origin, destination);
        }

        console.log('[DistanceService] Calling OpenRouteService API...');

        const url = 'https://api.openrouteservice.org/v2/directions/driving-car';
        const body = {
            coordinates: [
                [origin.lng, origin.lat],
                [destination.lng, destination.lat]
            ],
            units: 'km'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body),
            timeout: 10000 // 10 second timeout
        });

        if (!response.ok) {
            console.warn(`[DistanceService] ORS API error: ${response.status}`);
            return useFallback(origin, destination);
        }

        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            console.warn('[DistanceService] No routes found in ORS response');
            return useFallback(origin, destination);
        }

        const route = data.routes[0];
        const distanceKm = route.summary.distance; // Already in km
        const durationMinutes = Math.round(route.summary.duration / 60);

        const result = {
            distanceKm: Math.round(distanceKm * 10) / 10, // Round to 1 decimal
            durationMinutes,
            source: 'ORS'
        };

        // Cache the result
        distanceCache.set(cacheKey, {
            data: result,
            expiresAt: Date.now() + CACHE_TTL
        });

        console.log(`[DistanceService] Distance calculated: ${result.distanceKm} km via ORS`);
        return result;

    } catch (error) {
        console.error('[DistanceService] Error calculating distance:', error.message);
        return useFallback(origin, destination);
    }
};

/**
 * Fallback to Haversine formula when ORS API fails
 */
const useFallback = (origin, destination) => {
    const distanceKm = haversineDistance(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng
    );

    const result = {
        distanceKm: Math.round(distanceKm * 10) / 10,
        durationMinutes: Math.round(distanceKm * 2), // Rough estimate: 30 km/h average
        source: 'HAVERSINE'
    };

    console.log(`[DistanceService] Distance calculated: ${result.distanceKm} km via Haversine`);
    return result;
};

/**
 * Validate latitude and longitude
 */
const isValidCoordinate = (lat, lng) => {
    return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180
    );
};

/**
 * Clear the distance cache
 */
const clearCache = () => {
    distanceCache.clear();
    console.log('[DistanceService] Cache cleared');
};

module.exports = {
    calculateDistance,
    haversineDistance,
    clearCache,
    isValidCoordinate
};
