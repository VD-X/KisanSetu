const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, days) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);

exports.getSummary = async (req, res) => {
    try {
        if (req.user.role !== 'TRANSPORTER') {
            return res.status(403).json({ error: 'Only transporters can view earnings' });
        }

        const transporterId = req.user.id;
        const now = new Date();
        const todayStart = startOfDay(now);
        const weekStart = addDays(todayStart, -7);
        const monthStart = addDays(todayStart, -30);

        const earnings = await prisma.earning.findMany({
            where: { transporterId },
            select: { amount: true, createdAt: true }
        });

        let total = 0;
        let today = 0;
        let week = 0;
        let month = 0;

        for (const e of earnings) {
            const amount = Number(e.amount) || 0;
            total += amount;
            const ts = new Date(e.createdAt);
            if (ts >= todayStart) today += amount;
            if (ts >= weekStart) week += amount;
            if (ts >= monthStart) month += amount;
        }

        res.json({
            transporterId,
            total,
            today,
            week,
            month
        });
    } catch (error) {
        console.error('Get earnings summary error:', error);
        res.status(500).json({ error: 'Failed to fetch earnings summary' });
    }
};

exports.getEarnings = async (req, res) => {
    try {
        if (req.user.role !== 'TRANSPORTER') {
            return res.status(403).json({ error: 'Only transporters can view earnings' });
        }

        const transporterId = req.user.id;
        const earnings = await prisma.earning.findMany({
            where: { transporterId },
            include: {
                delivery: {
                    include: {
                        order: {
                            include: {
                                listing: { include: { crop: true } },
                                buyer: { include: { buyerProfile: true } },
                                farmer: { include: { farmerProfile: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const items = earnings.map(e => {
            const cropName = e.delivery?.order?.listing?.crop?.name || undefined;
            const farmerName = e.delivery?.order?.farmer?.farmerProfile?.fullName || undefined;
            const buyerLocation = e.delivery?.order?.buyer?.buyerProfile
                ? `${e.delivery.order.buyer.buyerProfile.city}, ${e.delivery.order.buyer.buyerProfile.state}`
                : undefined;

            return {
                id: e.id,
                deliveryId: e.deliveryId,
                cropName,
                farmerName,
                buyerLocation,
                distance: e.distance,
                pricePerKm: e.pricePerKm,
                amount: e.amount,
                createdAt: e.createdAt
            };
        });

        res.json({ earnings: items, count: items.length });
    } catch (error) {
        console.error('Get earnings error:', error);
        res.status(500).json({ error: 'Failed to fetch earnings' });
    }
};

