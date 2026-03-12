const distanceService = require('../services/distanceService');
const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate distance between two locations
 * POST /api/location/calculate-distance
 * Body: { origin: { lat, lng }, destination: { lat, lng } }
 */
const calculateDistance = async (req, res) => {
    try {
        const { origin, destination } = req.body;

        // Validate input
        if (!origin || !destination) {
            return res.status(400).json({
                success: false,
                error: 'Origin and destination coordinates are required'
            });
        }

        if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) {
            return res.status(400).json({
                success: false,
                error: 'Invalid coordinate format. Required: { lat, lng }'
            });
        }

        // Validate coordinates
        if (!distanceService.isValidCoordinate(origin.lat, origin.lng) ||
            !distanceService.isValidCoordinate(destination.lat, destination.lng)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180'
            });
        }

        console.log(`[LocationController] Calculating distance from (${origin.lat}, ${origin.lng}) to (${destination.lat}, ${destination.lng})`);

        // Calculate distance
        const result = await distanceService.calculateDistance(origin, destination);

        res.json({
            success: true,
            data: {
                distanceKm: result.distanceKm,
                durationMinutes: result.durationMinutes,
                source: result.source,
                origin,
                destination
            }
        });

    } catch (error) {
        console.error('[calculateDistance] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate distance',
            message: error.message
        });
    }
};

/**
 * Update user's location in profile
 * PUT /api/location/update-profile
 * Body: { latitude, longitude, locationSource, address }
 */
const updateProfile = async (req, res) => {
    try {
        const { latitude, longitude, locationSource, address } = req.body;
        const userId = req.user.id;

        // Validate coordinates if provided
        if (latitude !== undefined && longitude !== undefined) {
            if (!distanceService.isValidCoordinate(latitude, longitude)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid coordinates'
                });
            }
        }

        // Validate locationSource
        if (locationSource && !['GPS', 'MANUAL'].includes(locationSource)) {
            return res.status(400).json({
                success: false,
                error: 'locationSource must be either "GPS" or "MANUAL"'
            });
        }

        // Get user's buyer profile
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { buyerProfile: true }
        });

        if (!user || !user.buyerProfile) {
            return res.status(404).json({
                success: false,
                error: 'Buyer profile not found'
            });
        }

        // Update buyer profile with location
        const updatedProfile = await prisma.buyerProfile.update({
            where: { id: user.buyerProfile.id },
            data: {
                latitude,
                longitude,
                locationSource,
                address,
                updatedAt: new Date()
            }
        });

        console.log(`[LocationController] Updated location for user ${userId}: ${locationSource}`);

        res.json({
            success: true,
            data: {
                latitude: updatedProfile.latitude,
                longitude: updatedProfile.longitude,
                locationSource: updatedProfile.locationSource,
                address: updatedProfile.address
            }
        });

    } catch (error) {
        console.error('[updateProfile] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update location',
            message: error.message
        });
    }
};

/**
 * Update farmer's location in profile
 * PUT /api/location/update-farmer-profile
 * Body: { latitude, longitude, locationSource, address }
 */
const updateFarmerProfile = async (req, res) => {
    try {
        const { latitude, longitude, locationSource, address } = req.body;
        const userId = req.user.id;

        if (latitude !== undefined && longitude !== undefined) {
            if (!distanceService.isValidCoordinate(latitude, longitude)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid coordinates'
                });
            }
        }

        if (locationSource && !['GPS', 'MANUAL'].includes(locationSource)) {
            return res.status(400).json({
                success: false,
                error: 'locationSource must be either \"GPS\" or \"MANUAL\"'
            });
        }

        if (address !== undefined && typeof address === 'string' && address.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Address cannot be empty'
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { farmerProfile: true }
        });

        if (!user || !user.farmerProfile) {
            return res.status(404).json({
                success: false,
                error: 'Farmer profile not found'
            });
        }

        const updatedProfile = await prisma.farmerProfile.update({
            where: { id: user.farmerProfile.id },
            data: {
                latitude,
                longitude,
                locationSource,
                address
            }
        });

        console.log(`[LocationController] Updated farmer location for user ${userId}: ${locationSource || 'N/A'}`);

        res.json({
            success: true,
            data: {
                latitude: updatedProfile.latitude,
                longitude: updatedProfile.longitude,
                locationSource: updatedProfile.locationSource,
                address: updatedProfile.address
            }
        });
    } catch (error) {
        console.error('[updateFarmerProfile] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update location',
            message: error.message
        });
    }
};

/**
 * Validate coordinates
 * POST /api/location/validate
 * Body: { latitude, longitude }
 */
const validateCoordinates = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }

        const isValid = distanceService.isValidCoordinate(latitude, longitude);

        res.json({
            success: true,
            data: {
                isValid,
                latitude,
                longitude
            }
        });

    } catch (error) {
        console.error('[validateCoordinates] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate coordinates',
            message: error.message
        });
    }
};

/**
 * Proxy geocoding requests to Nominatim
 * GET /api/location/geocode?q=query
 */
const geocode = async (req, res) => {
    try {
        const { q, limit = 1 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Query string is required'
            });
        }

        console.log(`[LocationController] Geocoding query: ${q}, limit: ${limit}`);

        // Include addressdetails=1 to get granular fields for suggestions list
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=${limit}&addressdetails=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'KisanSetu/1.0 (contact: admin@kisansetu.com)',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data = await response.json();

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('[geocode] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to geocode address',
            message: error.message
        });
    }
};

/**
 * Proxy reverse geocoding requests to Nominatim
 * GET /api/location/reverse-geocode?lat=latitude&lon=longitude
 */
const reverseGeocode = async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }

        console.log(`[LocationController] Reverse geocoding: ${lat}, ${lon}`);

        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'KisanSetu/1.0 (contact: admin@kisansetu.com)',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data = await response.json();

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('[reverseGeocode] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reverse geocode coordinates',
            message: error.message
        });
    }
};

module.exports = {
    calculateDistance,
    updateProfile,
    updateFarmerProfile,
    validateCoordinates,
    geocode,
    reverseGeocode
};
