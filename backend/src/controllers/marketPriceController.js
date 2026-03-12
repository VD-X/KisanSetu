const marketPriceService = require('../services/marketPriceService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get today's market prices for all crops
 * GET /api/market-prices/daily
 */
const getDailyPrices = async (req, res) => {
    try {
        // Get user's location from their profile
        let location = req.query.location; // Allow override via query param

        if (!location && req.dbUser) {
            const user = req.dbUser;
            if (user?.farmerProfile) {
                const { district, state } = user.farmerProfile;
                location = district && state ? `${district}, ${state}` : (district || state);
                console.log(`[Controller] Farmer Profile Location: ${location} (District: ${district}, State: ${state})`);
            } else if (user?.buyerProfile) {
                const { city, state } = user.buyerProfile;
                location = city && state ? `${city}, ${state}` : (city || state);
                console.log(`[Controller] Buyer Profile Location: ${location} (City: ${city}, State: ${state})`);
            }
        }

        // Default to India if no location found
        location = location || 'India';

        console.log(`[Controller] Fetching daily prices for location: ${location}`);
        const prices = await marketPriceService.getTodaysPrices(location);

        res.json({
            success: true,
            date: new Date().toISOString().split('T')[0],
            location,
            count: prices.length,
            prices
        });
    } catch (error) {
        console.error('[getDailyPrices] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch market prices',
            message: error.message
        });
    }
};

/**
 * Get smart price suggestion for a listing
 * GET /api/market-prices/suggestion?cropId=xxx&grade=Premium&quantity=100
 */
const getPriceSuggestion = async (req, res) => {
    try {
        const { cropId, grade = 'Good', quantity = 100 } = req.query;

        if (!cropId) {
            return res.status(400).json({
                success: false,
                error: 'cropId is required'
            });
        }

        console.log(`[Controller] Calculating price suggestion for crop ${cropId}`);
        const suggestion = await marketPriceService.calculatePriceSuggestion(
            cropId,
            grade,
            parseInt(quantity) || 100
        );

        res.json({
            success: true,
            ...suggestion
        });
    } catch (error) {
        console.error('[getPriceSuggestion] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate price suggestion',
            message: error.message
        });
    }
};

/**
 * Get price for a specific crop
 * GET /api/market-prices/crop/:cropId
 */
const getCropPrice = async (req, res) => {
    try {
        const { cropId } = req.params;
        const location = req.query.location || 'India';

        if (!cropId) {
            return res.status(400).json({
                success: false,
                error: 'cropId is required'
            });
        }

        console.log(`[Controller] Fetching price for crop ${cropId}`);
        const price = await marketPriceService.getPriceForCrop(cropId, location);

        res.json({
            success: true,
            price
        });
    } catch (error) {
        console.error('[getCropPrice] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch crop price',
            message: error.message
        });
    }
};

/**
 * Admin endpoint to refresh prices (clear cache and force refetch)
 * POST /api/market-prices/refresh
 */
const refreshPrices = async (req, res) => {
    try {
        console.log('[Controller] Admin triggered price refresh');

        // Clear cache
        marketPriceService.clearCache();

        let location = req.body?.location || req.query?.location;

        if (!location && req.dbUser) {
            const user = req.dbUser;
            if (user?.farmerProfile) {
                const { district, state } = user.farmerProfile;
                location = district && state ? `${district}, ${state}` : (district || state);
            } else if (user?.buyerProfile) {
                const { city, state } = user.buyerProfile;
                location = city && state ? `${city}, ${state}` : (city || state);
            }
        }

        location = location || 'India';

        // Fetch fresh prices for the user's specific state
        const prices = await marketPriceService.getTodaysPrices(location);

        res.json({
            success: true,
            message: `Prices refreshed successfully for ${location}`,
            count: prices.length,
            location: location,
            date: new Date().toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('[refreshPrices] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh prices',
            message: error.message
        });
    }
};

/**
 * Get historical price data for charts
 * GET /api/market-prices/history/:cropId?days=30
 */
const getHistoricalPrices = async (req, res) => {
    try {
        const { cropId } = req.params;
        const { days = 30, location } = req.query;

        if (!cropId) {
            return res.status(400).json({ error: 'cropId is required' });
        }

        const history = await marketPriceService.getHistoricalPrices(
            cropId,
            parseInt(days),
            location || 'India'
        );

        res.json({
            success: true,
            cropId,
            days: parseInt(days),
            data: history
        });
    } catch (error) {
        console.error('[getHistoricalPrices] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch historical prices'
        });
    }
};

module.exports = {
    getDailyPrices,
    getPriceSuggestion,
    getCropPrice,
    refreshPrices,
    getHistoricalPrices
};
