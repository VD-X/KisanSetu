const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Submit a Review (Farmer -> Buyer or Buyer -> Farmer)
const submitReview = async (req, res) => {
    try {
        const { revieweeId, orderId, rating, comment, role } = req.body; // role = role of reviewee
        const reviewerId = req.user.id;

        // 1. Create the review
        const review = await prisma.review.create({
            data: {
                reviewerId,
                revieweeId,
                orderId,
                rating,
                comment,
                role
            }
        });

        // 2. Update the reviewee's aggregate rating
        if (role === 'FARMER') {
            const profile = await prisma.farmerProfile.findUnique({ where: { userId: revieweeId } });
            if (profile) {
                const newCount = profile.reviewCount + 1;
                const newRating = ((profile.rating * profile.reviewCount) + rating) / newCount;
                await prisma.farmerProfile.update({
                    where: { id: profile.id },
                    data: { rating: newRating, reviewCount: newCount }
                });
            }
        } else if (role === 'BUYER') {
            const profile = await prisma.buyerProfile.findUnique({ where: { userId: revieweeId } });
            if (profile) {
                const newCount = profile.reviewCount + 1;
                const newRating = ((profile.rating * profile.reviewCount) + rating) / newCount;
                await prisma.buyerProfile.update({
                    where: { id: profile.id },
                    data: { rating: newRating, reviewCount: newCount }
                });
            }
        }

        res.status(201).json(review);
    } catch (error) {
        console.error('Submit review error:', error);
        res.status(500).json({ message: 'Failed to submit review' });
    }
};

// Get Public Profile with Reviews
const getPublicProfile = async (req, res) => {
    try {
        const { role, id } = req.params; // id is userId
        let profile = null;
        let reviews = [];

        if (role === 'FARMER') {
            profile = await prisma.farmerProfile.findUnique({ where: { userId: id } });
            reviews = await prisma.review.findMany({
                where: { revieweeId: id, role: 'FARMER' },
                include: { reviewer: { select: { id: true, buyerProfile: { select: { fullName: true } } } } },
                orderBy: { createdAt: 'desc' }
            });
        } else if (role === 'BUYER') {
            profile = await prisma.buyerProfile.findUnique({ where: { userId: id } });
            reviews = await prisma.review.findMany({
                where: { revieweeId: id, role: 'BUYER' },
                include: { reviewer: { select: { id: true, farmerProfile: { select: { fullName: true } } } } },
                orderBy: { createdAt: 'desc' }
            });
        }

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Fetch User badges
        const user = await prisma.user.findUnique({
            where: { id },
            select: { isVerified: true, badges: true, createdAt: true }
        });

        res.json({
            ...profile,
            isVerified: user.isVerified,
            badges: user.badges,
            memberSince: user.createdAt,
            reviews
        });
    } catch (error) {
        console.error('Get public profile error:', error);
        res.status(500).json({ message: 'Failed to fetch profile' });
    }
};

module.exports = { submitReview, getPublicProfile };