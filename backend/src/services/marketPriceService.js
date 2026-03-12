const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { callNvidiaChat, safeJsonParse } = require('./nvidiaVisionService');

// In-memory cache for market prices
const priceCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Helper to get today's date string
const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

// Helper to check if cache is valid
const isCacheValid = (cacheEntry) => {
    if (!cacheEntry) return false;
    const today = getTodayDateString();
    return cacheEntry.date === today && Date.now() < cacheEntry.expiresAt;
};

// MSP (Minimum Support Price) data for common crops (2024-25 season)
const MSP_DATA = {
    'Tomato': 18,
    'Wheat': 22.75,
    'Rice': 21.83,
    'Onion': 16,
    'Potato': 12,
    'Cotton': 64.62,
    'Soybean': 46.00,
    'Maize': 20.40,
    'Pumpkin': 15.00,
    'Garlic': 60.00,
    'Ginger': 45.00
};

/**
 * Fetch market price and analytics using Llama 3.1 90B via NVIDIA API
 */
const fetchFromNvidiaQwen = async (cropName, district, state) => {
    try {
        const locationStr = district && state ? `${district}, ${state}` : (state || district || 'India');
        const prompt = `You are an expert agricultural economist and market data provider for India.
Provide the current realistic market price (mandi bhav) and a brief market insight for ${cropName} in ${locationStr}, India.

Respond ONLY with valid JSON in this exact schema. Do not include any markdown formatting, explanations, or text outside the JSON object:
{
  "crop": "${cropName}",
  "mandi": "string (name of a major market specifically in ${district || 'the area'} or nearby in ${state})",
  "variety": "string (specific variety if applicable, e.g. 'Sona Masuri', 'Hybrid', 'Local')",
  "min": number (minimum price in ₹/kg),
  "max": number (maximum price in ₹/kg),
  "avg": number (average price in ₹/kg),
  "date": "${getTodayDateString()}",
  "analytics": "string (A concise 3-4 sentence market insight including current trend, reason, and a suggestion for farmers)"
}

Use realistic prices based on current Indian market trends for the 2024/2025 season. Prices MUST be in rupees per kilogram (₹/kg). If ${district} is provided, prioritize specific mandis within that district (e.g. if Guntur is district, mention 'Guntur Mirchi Yard' if relevant).`;

        const payload = await callNvidiaChat({
            model: 'qwen/qwen3.5-397b-a17b',
            requestTag: 'fetchMarketPriceQwen',
            max_tokens: 1024,
            temperature: 0.60,
            top_p: 0.95,
            messages: [
                { role: 'user', content: prompt }
            ]
        });

        if (!payload || !payload.choices || !payload.choices[0] || !payload.choices[0].message) {
            console.warn('[Qwen] Invalid API response format');
            return null;
        }

        const textContent = payload.choices[0].message.content;
        const priceData = safeJsonParse(textContent);

        if (priceData && priceData.min && priceData.max && priceData.avg) {
            console.log(`[Qwen] Successfully generated price & analytics for ${cropName} in ${locationStr}`);
            priceData.source = 'NVIDIA Qwen 3.5 397B';
            priceData.state = state;
            return priceData;
        }

        console.warn('[Qwen] Parsed JSON missing required price fields', priceData);
        return null;
    } catch (error) {
        console.error('[Qwen] Error:', error.message);
        return null;
    }
};

/**
 * Generate mock realistic prices as final fallback
 */
const generateMockPrice = (cropName, location = 'India') => {
    const msp = MSP_DATA[cropName] || 20;

    // Generate realistic price range around MSP
    const min = Math.round(msp * 0.9 * 10) / 10;
    const max = Math.round(msp * 1.3 * 10) / 10;
    const avg = Math.round(((min + max) / 2) * 10) / 10;

    // Format mandi name based on location
    const mandi = location.includes('Mandi') ? location : `${location} Mandi`;

    return {
        crop: cropName,
        mandi,
        state: location,
        min,
        max,
        avg,
        date: getTodayDateString()
    };
};

/**
 * Get market price for a specific crop with multi-source fallback
 */
const getPriceForCrop = async (cropId, location = 'India') => {
    try {
        // Get crop details
        const crop = await prisma.crop.findUnique({
            where: { id: cropId },
            select: { id: true, name: true, icon: true }
        });

        if (!crop) {
            throw new Error('Crop not found');
        }

        const cacheKey = `price_${cropId}_${location}_${getTodayDateString()}`;
        const cached = priceCache.get(cacheKey);

        if (isCacheValid(cached)) {
            console.log(`[Cache] Returning cached price for ${crop.name} in ${location}`);
            return cached.data;
        }

        // Check database for today's price
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Parse location into district and state
        let district = '';
        let state = location;
        if (location.includes(',')) {
            const parts = location.split(',').map(p => p.trim());
            district = parts[0];
            state = parts[1];
        }

        // Search for specific district/state combo OR state average if no district provided
        console.log(`[Service] Searching DB for ${crop.name} in state: ${state}, district: ${district || 'ANY'}`);
        const dbPrice = await prisma.marketPrice.findFirst({
            where: {
                cropId: crop.id,
                state: state,
                ...(district ? { district: district } : {}),
                date: { gte: today }
            },
            orderBy: { date: 'desc' }
        });

        if (dbPrice) {
            const priceData = {
                cropId: dbPrice.cropId,
                crop: crop.name,
                icon: crop.icon,
                mandi: dbPrice.mandi,
                state: dbPrice.state,
                variety: dbPrice.variety,
                min: dbPrice.min,
                max: dbPrice.max,
                avg: dbPrice.avg,
                msp: MSP_DATA[crop.name] || null,
                analytics: dbPrice.analytics,
                date: getTodayDateString(),
                source: dbPrice.source
            };

            // Cache it
            priceCache.set(cacheKey, {
                data: priceData,
                date: getTodayDateString(),
                expiresAt: Date.now() + CACHE_TTL
            });

            return priceData;
        }

        // Try fetching from Qwen 397B
        console.log(`[Service] Fetching new price and analytics for ${crop.name} in ${location}`);

        let priceData = await fetchFromNvidiaQwen(crop.name, district, state);
        let analytics = priceData?.analytics;

        if (!priceData) {
            console.log(`[Service] Qwen 397B failed, using mock data for ${crop.name}`);
            priceData = generateMockPrice(crop.name, location);
            analytics = `Market for ${priceData.crop} in ${location} is active with an average price of ₹${priceData.avg}/kg. Monitor local mandi arrivals for daily fluctuations.`;
        }

        // Format mandi name based on location
        const mandiName = location.includes('Mandi') ? location : `${location} Mandi`;

        // Store in database
        const savedPrice = await prisma.marketPrice.create({
            data: {
                cropId: crop.id,
                mandi: priceData.mandi || mandiName,
                district: district || null,
                state: state || location,
                variety: priceData.variety || null,
                min: priceData.min,
                max: priceData.max,
                avg: priceData.avg,
                analytics: analytics,
                source: priceData.source || 'AI',
                date: new Date()
            }
        });

        const result = {
            cropId: crop.id,
            crop: crop.name,
            icon: crop.icon,
            mandi: savedPrice.mandi,
            state: savedPrice.state,
            variety: savedPrice.variety,
            min: savedPrice.min,
            max: savedPrice.max,
            avg: savedPrice.avg,
            msp: MSP_DATA[crop.name] || null,
            analytics: savedPrice.analytics,
            date: getTodayDateString(),
            source: savedPrice.source
        };

        // Cache it
        priceCache.set(cacheKey, {
            data: result,
            date: getTodayDateString(),
            expiresAt: Date.now() + CACHE_TTL
        });

        return result;
    } catch (error) {
        console.error('[getPriceForCrop] Error:', error);
        throw error;
    }
};

/**
 * Get today's prices for all crops
 */
const getTodaysPrices = async (location = 'India') => {
    try {
        const cacheKey = `all_prices_${location}_${getTodayDateString()}`;
        const cached = priceCache.get(cacheKey);

        if (isCacheValid(cached)) {
            console.log(`[Cache] Returning cached prices for all crops in ${location}`);
            return cached.data;
        }

        // Get all active crops
        const crops = await prisma.crop.findMany({
            where: { isActive: true },
            select: { id: true, name: true, icon: true }
        });

        // Fetch prices for each crop
        const pricePromises = crops.map(crop =>
            getPriceForCrop(crop.id, location).catch(err => {
                console.error(`Error fetching price for ${crop.name}:`, err);
                return null;
            })
        );

        const prices = (await Promise.all(pricePromises)).filter(p => p !== null);

        // Cache the result
        priceCache.set(cacheKey, {
            data: prices,
            date: getTodayDateString(),
            expiresAt: Date.now() + CACHE_TTL
        });

        return prices;
    } catch (error) {
        console.error('[getTodaysPrices] Error:', error);
        throw error;
    }
};

/**
 * Calculate smart price suggestion based on market data and crop quality
 */
const calculatePriceSuggestion = async (cropId, grade = 'Good', quantity = 100) => {
    try {
        const priceData = await getPriceForCrop(cropId);

        if (!priceData) {
            throw new Error('Unable to fetch market price');
        }

        const { min, max, avg } = priceData;

        // Grade multipliers
        const gradeMultipliers = {
            'Premium': 1.10,  // 10% above average
            'Good': 1.05,     // 5% above average
            'Average': 1.00,  // At average
            'Fair': 0.95      // 5% below average
        };

        const multiplier = gradeMultipliers[grade] || 1.00;

        // Quantity adjustment (bulk discount for large quantities)
        let quantityAdjustment = 1.0;
        if (quantity >= 1000) {
            quantityAdjustment = 0.98; // 2% discount for bulk
        } else if (quantity >= 500) {
            quantityAdjustment = 0.99; // 1% discount
        }

        // Calculate suggested price
        const basePrice = avg * multiplier * quantityAdjustment;
        const suggestedPrice = Math.round(basePrice * 10) / 10; // Round to 1 decimal

        // Ensure suggested price is within min-max range (with some flexibility)
        const finalPrice = Math.max(min * 0.95, Math.min(max * 1.05, suggestedPrice));

        // Generate reasoning
        let reasoning = `Based on current market average of ₹${avg}/kg`;
        if (grade !== 'Average') {
            reasoning += `, adjusted for ${grade} quality`;
        }
        if (quantity >= 500) {
            reasoning += `, with bulk quantity consideration`;
        }

        return {
            suggestedPrice: Math.round(finalPrice * 10) / 10,
            marketMin: min,
            marketMax: max,
            marketAvg: avg,
            grade,
            reasoning
        };
    } catch (error) {
        console.error('[calculatePriceSuggestion] Error:', error);
        throw error;
    }
};

/**
 * Clear cache (useful for admin refresh)
 */
const clearCache = () => {
    priceCache.clear();
    console.log('[Service] Price cache cleared');
};

const getHistoricalPrices = async (cropId, days = 30, location = 'India') => {
    try {
        const crop = await prisma.crop.findUnique({
            where: { id: cropId },
            select: { id: true, name: true }
        });

        if (!crop) {
            throw new Error('Crop not found');
        }

        // Fetch real data from DB
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const dbPrices = await prisma.marketPrice.findMany({
            where: {
                cropId: cropId,
                date: { gte: startDate }
            },
            orderBy: { date: 'asc' }
        });

        // If we have enough data (e.g., > 50% of requested days), return it
        if (dbPrices.length >= days * 0.5) {
            return dbPrices.map(p => ({
                date: p.date.toISOString().split('T')[0],
                avg: p.avg,
                min: p.min,
                max: p.max
            }));
        }

        // Otherwise generate mock trend data for demo
        console.log(`[Service] Generating mock historical data for ${crop.name}`);
        const data = [];
        const today = new Date();
        const msp = MSP_DATA[crop.name] || 20;
        let currentPrice = msp * (1 + (Math.random() * 0.4 - 0.2)); // Start around MSP +/- 20%

        for (let i = days; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            // Random daily fluctuation (+/- 5%)
            const change = (Math.random() * 0.1) - 0.05;
            currentPrice = currentPrice * (1 + change);

            // Ensure price stays within reasonable bounds (MSP * 0.5 to MSP * 2.0)
            currentPrice = Math.max(msp * 0.5, Math.min(msp * 2.0, currentPrice));

            data.push({
                date: dateStr,
                avg: Math.round(currentPrice * 10) / 10,
                min: Math.round(currentPrice * 0.9 * 10) / 10,
                max: Math.round(currentPrice * 1.1 * 10) / 10
            });
        }

        return data;
    } catch (error) {
        console.error('[getHistoricalPrices] Error:', error);
        throw error;
    }
};

const refreshAllPrices = async () => {
    console.log('[Service] Starting daily price refresh...');
    const locations = [
        'Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu', 
        'Maharashtra', 'Madhya Pradesh', 'Uttar Pradesh', 'Rajasthan', 
        'Punjab', 'Haryana', 'Gujarat', 'Bihar', 'West Bengal'
    ];

    // Clear old cache
    priceCache.clear();

    for (const loc of locations) {
        console.log(`[Service] Refreshing prices for ${loc}`);
        await getTodaysPrices(loc);
    }
    console.log('[Service] Daily price refresh completed.');
};

module.exports = {
    getTodaysPrices,
    getPriceForCrop,
    calculatePriceSuggestion,
    clearCache,
    fetchFromNvidiaQwen,
    generateMockPrice,
    getHistoricalPrices,
    refreshAllPrices
};
