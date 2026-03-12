const prisma = require('../config/db');

const formatFarmerPublic = (farmer) => {
    const profile = farmer?.farmerProfile;
    return {
        id: farmer?.id,
        name: profile?.fullName || undefined,
        location: profile ? `${profile.district}, ${profile.state}` : undefined
    };
};

// Get user's wishlist
exports.getWishlist = async (req, res) => {
    try {
        const userId = req.user.id;

        const wishlist = await prisma.wishlist.findUnique({
            where: { buyerId: userId },
            include: {
                items: {
                    include: {
                        listing: {
                            include: {
                                crop: true,
                                farmer: { include: { farmerProfile: true } }
                            }
                        }
                    }
                }
            }
        });

        if (!wishlist) {
            return res.status(200).json([]);
        }

        // Transform to return just the listings or a structured object
        // For now, let's return the simplified list of items
        const items = wishlist.items.map(item => ({
            ...item.listing,
            wishlistItemId: item.id,
            addedAt: item.createdAt,
            farmer: formatFarmerPublic(item.listing.farmer),
            crop: item.listing.crop
        }));

        res.json(items);
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ error: 'Failed to fetch wishlist' });
    }
};

// Add item to wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { listingId } = req.body;

        if (!listingId) {
            return res.status(400).json({ error: 'Listing ID is required' });
        }

        // Find or create wishlist
        let wishlist = await prisma.wishlist.findUnique({
            where: { buyerId: userId }
        });

        if (!wishlist) {
            wishlist = await prisma.wishlist.create({
                data: { buyerId: userId }
            });
        }

        // Check if item already exists
        const existingItem = await prisma.wishlistItem.findUnique({
            where: {
                wishlistId_listingId: {
                    wishlistId: wishlist.id,
                    listingId
                }
            }
        });

        if (existingItem) {
            return res.status(200).json({ message: 'Item already in wishlist' });
        }

        // Add item
        await prisma.wishlistItem.create({
            data: {
                wishlistId: wishlist.id,
                listingId
            }
        });

        res.status(200).json({ message: 'Added to wishlist' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ error: 'Failed to add to wishlist' });
    }
};

// Remove item from wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { listingId } = req.params;

        const wishlist = await prisma.wishlist.findUnique({
            where: { buyerId: userId }
        });

        if (!wishlist) {
            return res.status(404).json({ error: 'Wishlist not found' });
        }

        await prisma.wishlistItem.deleteMany({
            where: {
                wishlistId: wishlist.id,
                listingId
            }
        });

        res.json({ message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ error: 'Failed to remove from wishlist' });
    }
};

// Get wishlist IDs only (for quick client-side check)
exports.getWishlistIds = async (req, res) => {
    try {
        const userId = req.user.id;

        const wishlist = await prisma.wishlist.findUnique({
            where: { buyerId: userId },
            include: {
                items: {
                    select: { listingId: true }
                }
            }
        });

        if (!wishlist) {
            return res.status(200).json([]);
        }

        const ids = wishlist.items.map(item => item.listingId);
        res.json(ids);
    } catch (error) {
        console.error('Error fetching wishlist IDs:', error);
        res.status(500).json({ error: 'Failed to fetch wishlist IDs' });
    }
};
