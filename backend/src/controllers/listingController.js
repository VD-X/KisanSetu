const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { resolveFarmerListingLocation } = require('../services/locationDefaultsService');

const getFarmerDefaultLocation = async (farmerId) => {
    const user = await prisma.user.findUnique({
        where: { id: farmerId },
        include: { farmerProfile: true }
    });
    return resolveFarmerListingLocation(user?.farmerProfile);
};

const formatFarmerOwner = (farmer) => {
    const profile = farmer?.farmerProfile;
    return {
        id: farmer?.id,
        name: profile?.fullName || undefined,
        phone: profile?.phone || undefined,
        village: profile?.village || undefined,
        district: profile?.district || undefined,
        state: profile?.state || undefined,
        location: profile ? `${profile.village}, ${profile.district}` : undefined
    };
};

const formatFarmerPublic = (farmer) => {
    const profile = farmer?.farmerProfile;
    return {
        id: farmer?.id,
        name: profile?.fullName || undefined,
        location: profile ? `${profile.district}, ${profile.state}` : undefined
    };
};

const formatBuyerUser = (buyer) => {
    const profile = buyer?.buyerProfile;
    return {
        id: buyer?.id,
        name: profile?.fullName || undefined,
        phone: profile?.phone || undefined,
        city: profile?.city || undefined,
        state: profile?.state || undefined,
        location: profile ? `${profile.city}, ${profile.state}` : undefined
    };
};

// Create a new crop listing (Farmer only)
exports.createListing = async (req, res) => {
    try {
        const {
            cropId,
            quantity,
            unit,
            expectedPrice,
            mandiPrice,
            msp,
            grade,
            harvestDate,
            harvestType,
            images,
            qualitySummary,
            saleDate
        } = req.body;

        const farmerId = req.user.id;

        if (req.user.role !== 'FARMER') {
            return res.status(403).json({ error: 'Only farmers can create listings' });
        }

        if (!cropId || !/^[0-9a-fA-F]{24}$/.test(cropId)) {
            return res.status(400).json({ error: 'Invalid cropId' });
        }

        // Verify crop exists
        const crop = await prisma.crop.findUnique({
            where: { id: cropId }
        });

        if (!crop) {
            return res.status(404).json({ error: 'Crop not found' });
        }

        const allowedHarvestTypes = new Set(['STANDING_CROP', 'HARVESTED_CROP', 'PROCESSED_CLEANED_CROP', 'SEED_NURSERY']);
        const resolvedHarvestType = allowedHarvestTypes.has(String(harvestType || '')) ? String(harvestType) : 'HARVESTED_CROP';

        const resolvedLocation = await getFarmerDefaultLocation(farmerId);
        if (!resolvedLocation) {
            return res.status(400).json({ error: 'Please set your farm location in profile before creating listings' });
        }

        // Create listing with AVAILABLE status
        const listing = await prisma.listing.create({
            data: {
                farmerId,
                cropId,
                quantity,
                unit: unit || 'kg',
                expectedPrice,
                mandiPrice,
                msp,
                grade,
                harvestDate: new Date(harvestDate),
                harvestType: resolvedHarvestType,
                images: images || [],
                location: resolvedLocation,
                qualitySummary: qualitySummary || null,
                saleDate: saleDate ? new Date(saleDate) : null,
                status: 'AVAILABLE' // Immediately available to all buyers
            },
            include: {
                crop: true,
                farmer: {
                    include: { farmerProfile: true }
                }
            }
        });

        listing.farmer = formatFarmerOwner(listing.farmer);

        // Emit WebSocket event to notify all buyers of new listing
        if (req.app.get('io')) {
            req.app.get('io').emit('notification', {
                type: 'new_listing',
                userId: 'all_buyers', // Special identifier for all buyers
                title: 'New Listing Available!',
                message: `New ${listing.crop.name} listing added by ${listing.farmer.name || 'Farmer'}. ${listing.quantity}kg available at ${listing.expectedPrice}/kg.`,
                listingId: listing.id,
                data: {
                    listing: listing,
                    crop: listing.crop
                }
            });
        }

        res.status(201).json({
            message: 'Listing created successfully and is now visible to all buyers',
            listing
        });
    } catch (error) {
        console.error('Create listing error:', error);
        res.status(500).json({ error: 'Failed to create listing' });
    }
};

// Get all available listings (for buyers - search and cart system)
// Get all available listings (for buyers - search and cart system)
exports.getAllListings = async (req, res) => {
    try {
        const {
            cropId,
            location,
            minPrice,
            maxPrice,
            grade,
            status,
            search,
            state,       // New param
            radius,      // New param
            latitude,    // New param (user's lat)
            longitude    // New param (user's lng)
        } = req.query;

        // Build filter
        const where = {};

        // Only show AVAILABLE listings by default for buyers
        if (status) {
            where.status = status;
        } else {
            where.status = 'AVAILABLE';
        }

        if (cropId && cropId !== 'undefined') {
            where.cropId = cropId;
        }

        if (location && location !== 'undefined') {
            where.location = {
                contains: location,
                mode: 'insensitive'
            };
        }

        if (grade && grade !== 'undefined') {
            where.grade = grade;
        }

        if (minPrice || maxPrice) {
            where.expectedPrice = {};
            if (minPrice && minPrice !== 'undefined') where.expectedPrice.gte = parseFloat(minPrice);
            if (maxPrice && maxPrice !== 'undefined') where.expectedPrice.lte = parseFloat(maxPrice);
        }

        // State Filtering
        if (state && state !== 'undefined' && state !== 'null') {
            where.farmer = {
                farmerProfile: {
                    state: {
                        contains: String(state),
                        mode: 'insensitive'
                    }
                }
            };
        }


        const listings = await prisma.listing.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                crop: true,
                farmer: {
                    include: { farmerProfile: true }
                }
            }
        });

        // Helper for distance
        const getDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        let validListings = listings;

        // Radius Filtering (In-memory)
        if (radius && latitude && longitude) {
            const userLat = parseFloat(latitude);
            const userLng = parseFloat(longitude);
            const radiusKm = parseFloat(radius);

            if (!isNaN(userLat) && !isNaN(userLng) && !isNaN(radiusKm)) {
                validListings = validListings.filter(l => {
                    const farmerLat = l.farmer?.farmerProfile?.latitude;
                    const farmerLng = l.farmer?.farmerProfile?.longitude;

                    if (farmerLat && farmerLng) {
                        const dist = getDistance(userLat, userLng, farmerLat, farmerLng);
                        return dist <= radiusKm;
                    }
                    return false;
                });
            }
        }

        // Format for response
        const formattedListings = validListings.map(l => {
            if (!l.crop || !l.farmer) return null;
            return {
                ...l,
                farmer: formatFarmerPublic(l.farmer)
            };
        }).filter(l => l !== null);

        res.json({
            listings: formattedListings,
            count: formattedListings.length
        });
    } catch (error) {
        console.error('Get listings error:', error);
        res.status(500).json({ error: 'Failed to fetch listings', details: error.message });
    }
};

// Get single listing details
exports.getListingById = async (req, res) => {
    try {
        const { id } = req.params;

        const listing = await prisma.listing.findUnique({
            where: { id },
            include: {
                crop: true,
                farmer: {
                    include: { farmerProfile: true }
                }
            }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        listing.farmer = formatFarmerPublic(listing.farmer);
        res.json({ listing });
    } catch (error) {
        console.error('Get listing error:', error);
        res.status(500).json({ error: 'Failed to fetch listing' });
    }
};

// Get farmer's own listings
exports.getMyListings = async (req, res) => {
    try {
        const farmerId = req.user.id;

        if (req.user.role !== 'FARMER') {
            return res.status(403).json({ error: 'Only farmers can view their listings' });
        }

        const listings = await prisma.listing.findMany({
            where: { farmerId },
            include: {
                crop: true,
                orders: {
                    include: {
                        buyer: {
                            include: { buyerProfile: true }
                        }
                    }
                },
                chats: {
                    include: {
                        buyer: {
                            include: { buyerProfile: true }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const formatted = listings.map(l => {
            if (Array.isArray(l.orders)) {
                l.orders = l.orders.map(o => {
                    o.buyer = formatBuyerUser(o.buyer);
                    return o;
                });
            }
            if (Array.isArray(l.chats)) {
                l.chats = l.chats.map(c => {
                    c.buyer = formatBuyerUser(c.buyer);
                    return c;
                });
            }
            return l;
        });

        res.json({ listings: formatted });
    } catch (error) {
        console.error('Get my listings error:', error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
};

// Update listing
exports.updateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const farmerId = req.user.id;
        const updateData = req.body;

        // Check if listing exists and belongs to farmer
        const listing = await prisma.listing.findUnique({
            where: { id }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        if (listing.farmerId !== farmerId) {
            return res.status(403).json({ error: 'You can only update your own listings' });
        }

        // Don't allow updating certain fields if listing has orders
        const hasOrders = await prisma.order.findFirst({
            where: { listingId: id }
        });

        if (hasOrders) {
            // Remove fields that shouldn't be updated after orders exist
            delete updateData.cropId;
            delete updateData.quantity;
        }

        // Convert harvestDate if provided
        if (updateData.harvestDate) {
            updateData.harvestDate = new Date(updateData.harvestDate);
        }

        if (updateData.saleDate) {
            updateData.saleDate = new Date(updateData.saleDate);
        }

        if (updateData.cropId && !/^[0-9a-fA-F]{24}$/.test(updateData.cropId)) {
            console.error('[ListingController] Invalid cropId format:', updateData.cropId);
            delete updateData.cropId;
        }

        if (updateData.harvestType) {
            const allowedHarvestTypes = new Set(['STANDING_CROP', 'HARVESTED_CROP', 'PROCESSED_CLEANED_CROP', 'SEED_NURSERY']);
            if (!allowedHarvestTypes.has(String(updateData.harvestType))) {
                delete updateData.harvestType;
            }
        }

        const resolvedLocation = await getFarmerDefaultLocation(farmerId);
        if (resolvedLocation) {
            updateData.location = resolvedLocation;
        } else {
            delete updateData.location;
        }

        console.log(`[ListingController] Updating listing ${id} with data:`, JSON.stringify(updateData, null, 2));

        const updatedListing = await prisma.listing.update({
            where: { id },
            data: updateData,
            include: {
                crop: true,
                farmer: {
                    include: { farmerProfile: true }
                }
            }
        });

        updatedListing.farmer = formatFarmerOwner(updatedListing.farmer);

        // Emit WebSocket event
        if (req.app.get('io')) {
            req.app.get('io').emit('listing:updated', {
                listing: updatedListing
            });
        }

        res.json({
            message: 'Listing updated successfully',
            listing: updatedListing
        });
    } catch (error) {
        console.error('Update listing error:', error);
        res.status(500).json({
            error: 'Failed to update listing',
            details: error.message,
            code: error.code // Prisma error code if available
        });
    }
};

// Delete listing
exports.deleteListing = async (req, res) => {
    try {
        const { id } = req.params;
        const farmerId = req.user.id;

        const listing = await prisma.listing.findUnique({
            where: { id }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        if (listing.farmerId !== farmerId) {
            return res.status(403).json({ error: 'You can only delete your own listings' });
        }

        // Check if listing has orders
        const hasOrders = await prisma.order.findFirst({
            where: { listingId: id }
        });

        if (hasOrders) {
            return res.status(400).json({
                error: 'Cannot delete listing with existing orders'
            });
        }

        await prisma.listing.delete({
            where: { id }
        });

        res.json({ message: 'Listing deleted successfully' });
    } catch (error) {
        console.error('Delete listing error:', error);
        res.status(500).json({ error: 'Failed to delete listing' });
    }
};

// Get all crops (for dropdown when creating listing)
exports.getAllCrops = async (req, res) => {
    try {
        const defaultCrops = [
            { name: 'Tomato', category: 'Vegetable', icon: '🍅' },
            { name: 'Onion', category: 'Vegetable', icon: '🧅' },
            { name: 'Potato', category: 'Vegetable', icon: '🥔' },
            { name: 'Sweet Potato', category: 'Vegetable', icon: '🍠' },
            { name: 'Red Chilli', category: 'Spice', icon: '🌶️' },
            { name: 'Green Chilli', category: 'Spice', icon: '🌶️' },
            { name: 'Bottle Gourd', category: 'Vegetable', icon: '🥒' },
            { name: 'Bitter Gourd', category: 'Vegetable', icon: '🥒' },
            { name: 'Gourd', category: 'Vegetable', icon: '🥒' },
            { name: 'Brinjal', category: 'Vegetable', icon: '🍆' },
            { name: 'Okra', category: 'Vegetable', icon: '🥬' },
            { name: 'Cauliflower', category: 'Vegetable', icon: '🥦' },
            { name: 'Cabbage', category: 'Vegetable', icon: '🥬' },
            { name: 'Carrot', category: 'Vegetable', icon: '🥕' },
            { name: 'Banana', category: 'Fruit', icon: '🍌' },
            { name: 'Mango', category: 'Fruit', icon: '🥭' },
            { name: 'Grapes', category: 'Fruit', icon: '🍇' },
            { name: 'Rice', category: 'Grain', icon: '🍚' },
            { name: 'Basmati Rice', category: 'Grain', icon: '🍚' },
            { name: 'Wheat', category: 'Grain', icon: '🌾' },
            { name: 'Maize', category: 'Grain', icon: '🌽' },
            { name: 'Sugarcane', category: 'Cash Crop', icon: '🎋' },
            { name: 'Cotton', category: 'Cash Crop', icon: '🧵' },
            { name: 'Groundnut', category: 'Oilseed', icon: '🥜' },
            { name: 'Soybean', category: 'Oilseed', icon: '🫘' },
            { name: 'Turmeric', category: 'Spice', icon: '🟡' },
            { name: 'Pumpkin', category: 'Vegetable', icon: '🎃' },
            { name: 'Garlic', category: 'Vegetable', icon: '🧄' },
            { name: 'Ginger', category: 'Vegetable', icon: '🫚' }
        ];

        const existing = await prisma.crop.findMany();
        const existingNames = new Set(existing.map(c => (c.name || '').toLowerCase()));
        const missing = defaultCrops.filter(c => !existingNames.has(c.name.toLowerCase()));

        for (const cropData of missing) {
            await prisma.crop.create({ data: cropData });
        }

        const crops = await prisma.crop.findMany({
            orderBy: {
                name: 'asc'
            }
        });

        res.json({ crops });
    } catch (error) {
        console.error('Get crops error:', error);
        res.status(500).json({ error: 'Failed to fetch crops' });
    }
};

// Search listings (advanced search for buyers)
exports.searchListings = async (req, res) => {
    try {
        const { q } = req.query; // Search query

        if (!q || q.trim().length === 0) {
            return res.json({ listings: [] });
        }

        const listings = await prisma.listing.findMany({
            where: {
                AND: [
                    { status: 'AVAILABLE' },
                    {
                        OR: [
                            {
                                crop: {
                                    name: {
                                        contains: q,
                                        mode: 'insensitive'
                                    }
                                }
                            },
                            {
                                location: {
                                    contains: q,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                grade: {
                                    contains: q,
                                    mode: 'insensitive'
                                }
                            }
                        ]
                    }
                ]
            },
            include: {
                crop: true,
                farmer: {
                    include: { farmerProfile: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const formatted = listings.map(l => {
            l.farmer = formatFarmerPublic(l.farmer);
            return l;
        });

        res.json({ listings: formatted });
    } catch (error) {
        console.error('Search listings error:', error);
        res.status(500).json({ error: 'Failed to search listings' });
    }
};

module.exports = exports;
