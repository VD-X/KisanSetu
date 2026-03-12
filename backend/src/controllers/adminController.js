const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper for pagination
const getPagination = (req) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

// Dashboard Stats
const getDashboardStats = async (req, res) => {
    try {
        const [
            totalFarmers,
            totalBuyers,
            totalTransporters,
            pendingTransporters,
            activeListings,
            totalOrders,
            ordersToday,
            ordersMonth,
            deliveriesProgress,
            deliveriesCompleted,
            totalEarnings
        ] = await Promise.all([
            prisma.user.count({ where: { role: 'FARMER' } }),
            prisma.user.count({ where: { role: 'BUYER' } }),
            prisma.user.count({ where: { role: 'TRANSPORTER' } }),
            prisma.transporterProfile.count({ where: { approvalStatus: 'PENDING' } }),
            prisma.listing.count({ where: { status: 'AVAILABLE' } }),
            prisma.order.count(),
            prisma.order.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            prisma.order.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    }
                }
            }),
            prisma.delivery.count({
                where: { status: { in: ['PICKED_UP', 'IN_TRANSIT'] } }
            }),
            prisma.delivery.count({
                where: { status: 'COMPLETED' }
            }),
            prisma.earning.aggregate({
                _sum: { amount: true }
            })
        ]);

        res.json({
            users: {
                farmers: totalFarmers,
                buyers: totalBuyers,
                transporters: totalTransporters,
                pendingTransporters
            },
            marketplace: {
                activeListings,
                totalOrders,
                ordersToday,
                ordersMonth,
                deliveriesProgress,
                deliveriesCompleted,
                totalEarnings: totalEarnings._sum.amount || 0
            }
        });
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

// User Management
const getUsers = async (req, res) => {
    try {
        const { role, search, status } = req.query;
        const { page, limit, skip } = getPagination(req);
        const where = { role };

        if (status) {
            where.status = status;
        }

        // Search is complex because name/phone are in profiles, not User model
        // We'll do a simpler email-only search for now
        if (search) {
            where.email = { contains: search, mode: 'insensitive' };
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    farmerProfile: true,
                    buyerProfile: true,
                    transporterProfile: true,
                    listings: { select: { id: true } },
                    ordersAsFarmer: { select: { id: true } },
                    ordersAsBuyer: { select: { id: true } },
                    earnings: { select: { amount: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.user.count({ where })
        ]);

        const formattedUsers = users.map(u => {
            // Get name and phone from the appropriate profile
            let name = 'N/A';
            let phone = 'N/A';
            let location = null;

            if (u.role === 'FARMER' && u.farmerProfile) {
                name = u.farmerProfile.fullName;
                phone = u.farmerProfile.phone;
                location = {
                    village: u.farmerProfile.village,
                    district: u.farmerProfile.district,
                    state: u.farmerProfile.state
                };
            } else if (u.role === 'BUYER' && u.buyerProfile) {
                name = u.buyerProfile.fullName;
                phone = u.buyerProfile.phone;
                location = {
                    city: u.buyerProfile.city,
                    state: u.buyerProfile.state
                };
            } else if (u.role === 'TRANSPORTER' && u.transporterProfile) {
                name = u.transporterProfile.fullName;
                phone = u.transporterProfile.phone;
            }

            return {
                id: u.id,
                name,
                email: u.email,
                phone,
                role: u.role,
                location,
                status: u.status,
                createdAt: u.createdAt,
                stats: {
                    totalListings: u.listings.length,
                    totalOrders: u.role === 'FARMER' ? u.ordersAsFarmer.length : u.ordersAsBuyer.length,
                    totalEarnings: u.earnings.reduce((sum, e) => sum + e.amount, 0)
                }
            };
        });

        res.json({
            users: formattedUsers,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const user = await prisma.user.update({
            where: { id },
            data: { status }
        });

        await logAdminAction(req.user.id, 'UPDATE_USER_STATUS', 'USER', id, { status, role: user.role });

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Transporter Management
const getTransporters = async (req, res) => {
    try {
        const { status, search } = req.query;
        const { page, limit, skip } = getPagination(req);
        const where = {};

        if (status) {
            if (['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
                where.approvalStatus = status;
            }
        }

        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { user: { email: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [transporters, total] = await Promise.all([
            prisma.transporterProfile.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            status: true,
                            earnings: { select: { amount: true } }
                        }
                    }
                },
                skip,
                take: limit
            }),
            prisma.transporterProfile.count({ where })
        ]);

        const formatted = await Promise.all(transporters.map(async (t) => {
            const completedDeliveries = await prisma.delivery.count({
                where: { transporterId: t.userId, status: 'COMPLETED' }
            });

            const totalEarnings = t.user.earnings.reduce((sum, e) => sum + e.amount, 0);

            return {
                ...t,
                fullName: t.fullName,
                email: t.user.email,
                phone: t.phone,
                userStatus: t.user.status,
                stats: { completedDeliveries, totalEarnings }
            };
        }));

        res.json({
            transporters: formatted,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const verifyTransporter = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const updated = await prisma.transporterProfile.update({
            where: { id },
            data: { approvalStatus: status }
        });

        await logAdminAction(req.user.id, 'VERIFY_TRANSPORTER', 'TRANSPORTER', id, { status });

        res.json({ message: `Transporter ${status}`, transporter: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Crop Management
const getCrops = async (req, res) => {
    try {
        const crops = await prisma.crop.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(crops);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createCrop = async (req, res) => {
    try {
        const { name, category, icon, translations } = req.body;

        if (!name || !category) {
            return res.status(400).json({ error: "Name and Category are required" });
        }

        const crop = await prisma.crop.create({
            data: {
                name,
                category,
                icon: icon || '🌱',
                translations: translations || {},
                isActive: true
            }
        });

        await logAdminAction(req.user.id, 'CREATE_CROP', 'CROP', crop.id, { name });

        res.json(crop);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateCrop = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, icon, translations, isActive } = req.body;

        const data = {};
        if (name) data.name = name;
        if (category) data.category = category;
        if (icon) data.icon = icon;
        if (translations) data.translations = translations;
        if (typeof isActive === 'boolean') data.isActive = isActive;

        const crop = await prisma.crop.update({
            where: { id },
            data
        });

        await logAdminAction(req.user.id, 'UPDATE_CROP', 'CROP', id, { changes: Object.keys(data) });

        res.json(crop);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Market Price Management
const getMarketPrices = async (req, res) => {
    try {
        const { cropId, source, date } = req.query;
        const where = {};
        if (cropId) where.cropId = cropId;
        if (source) where.source = source;
        if (date) {
            where.date = {
                gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                lt: new Date(new Date(date).setHours(23, 59, 59, 999))
            };
        }

        const prices = await prisma.marketPrice.findMany({
            where,
            include: { crop: true },
            orderBy: { date: 'desc' },
            take: 100 // Hard limit for prices still reasonable
        });
        res.json(prices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateMarketPrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { min, max, avg, mandi } = req.body;

        const updated = await prisma.marketPrice.update({
            where: { id },
            data: {
                min, max, avg, mandi,
                source: 'MANUAL',
                isOverride: true
            }
        });

        await logAdminAction(req.user.id, 'UPDATE_MARKET_PRICE', 'MARKET_PRICE', id, { min, max, avg, mandi });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createMarketPrice = async (req, res) => {
    try {
        const { cropId, mandi, min, max, avg } = req.body;
        const price = await prisma.marketPrice.create({
            data: {
                cropId, mandi, min, max, avg,
                source: 'MANUAL',
                isOverride: true,
                date: new Date()
            }
        });

        await logAdminAction(req.user.id, 'CREATE_MARKET_PRICE', 'MARKET_PRICE', price.id, { cropId, mandi });

        res.json(price);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const refreshPrices = async (req, res) => {
    try {
        console.log("Triggering price refresh...");
        await logAdminAction(req.user.id, 'REFRESH_PRICES', 'SYSTEM', null, { status: 'Triggered' });
        // In real app, this would call external API updater
        res.json({ message: "Price refresh triggered in background" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Listings Moderation
const getListings = async (req, res) => {
    try {
        const { farmerId, cropId, status } = req.query;
        const { page, limit, skip } = getPagination(req);
        const where = {};
        if (farmerId) where.farmerId = farmerId;
        if (cropId) where.cropId = cropId;
        if (status) where.status = status;

        const [listings, total] = await Promise.all([
            prisma.listing.findMany({
                where,
                include: {
                    farmer: {
                        select: {
                            email: true,
                            farmerProfile: { select: { fullName: true } }
                        }
                    },
                    crop: { select: { name: true, icon: true } },
                    _count: { select: { chats: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.listing.count({ where })
        ]);

        // Format listings to flatten farmer data
        const formattedListings = listings.map(listing => ({
            ...listing,
            farmer: {
                email: listing.farmer.email,
                name: listing.farmer.farmerProfile?.fullName || 'N/A'
            }
        }));

        res.json({
            listings: formattedListings,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateListingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // DISABLED, AVAILABLE (Resolved)

        const listing = await prisma.listing.update({
            where: { id },
            data: { status }
        });

        await logAdminAction(req.user.id, 'MODERATE_LISTING', 'LISTING', id, { status });

        res.json(listing);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Order & Delivery Management
const getOrders = async (req, res) => {
    try {
        const { status } = req.query;
        const { page, limit, skip } = getPagination(req);
        const where = {};
        if (status) where.orderStatus = status;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    farmer: {
                        select: {
                            email: true,
                            farmerProfile: { select: { fullName: true, phone: true } }
                        }
                    },
                    buyer: {
                        select: {
                            email: true,
                            buyerProfile: { select: { fullName: true, phone: true } }
                        }
                    },
                    listing: { select: { crop: { select: { name: true, icon: true } } } },
                    delivery: {
                        include: {
                            transporter: {
                                select: {
                                    transporterProfile: {
                                        select: { fullName: true, phone: true, vehicleNumber: true }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.order.count({ where })
        ]);

        // Format the response to flatten profile data
        const formattedOrders = orders.map(order => ({
            ...order,
            farmer: {
                email: order.farmer.email,
                name: order.farmer.farmerProfile?.fullName || 'N/A',
                phone: order.farmer.farmerProfile?.phone || 'N/A'
            },
            buyer: {
                email: order.buyer.email,
                name: order.buyer.buyerProfile?.fullName || 'N/A',
                phone: order.buyer.buyerProfile?.phone || 'N/A'
            },
            delivery: order.delivery ? {
                ...order.delivery,
                transporter: order.delivery.transporter ? {
                    name: order.delivery.transporter.transporterProfile?.fullName || 'N/A',
                    phone: order.delivery.transporter.transporterProfile?.phone || 'N/A',
                    vehicleNumber: order.delivery.transporter.transporterProfile?.vehicleNumber || 'N/A'
                } : null
            } : null
        }));

        res.json({
            orders: formattedOrders,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const order = await prisma.order.update({
            where: { id },
            data: { orderStatus: 'CANCELLED' }
        });

        if (order.delivery) {
            await prisma.delivery.update({
                where: { orderId: id },
                data: { status: 'CANCELLED' }
            });
        }

        await logAdminAction(req.user.id, 'CANCEL_ORDER', 'ORDER', id, { reason });

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const reassignTransporter = async (req, res) => {
    try {
        const { id } = req.params; // Order ID
        const { transporterId } = req.body; // Can be null to just unassign

        const delivery = await prisma.delivery.findUnique({ where: { orderId: id } });
        if (!delivery) return res.status(404).json({ error: "Delivery not found for this order" });

        const updatedDelivery = await prisma.delivery.update({
            where: { id: delivery.id },
            data: {
                transporterId: transporterId || null,
                status: transporterId ? 'TRANSPORTER_ASSIGNED' : 'WAITING_FOR_TRANSPORTER'
            }
        });

        await logAdminAction(req.user.id, 'REASSIGN_TRANSPORTER', 'DELIVERY', delivery.id, { previousTransporter: delivery.transporterId, newTransporter: transporterId });

        res.json(updatedDelivery);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Earnings Management
const getEarnings = async (req, res) => {
    try {
        const { transporterId, startDate, endDate } = req.query;
        const where = {};

        if (transporterId) where.transporterId = transporterId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const earnings = await prisma.earning.findMany({
            where,
            include: {
                transporter: { include: { transporterProfile: true } },
                delivery: { select: { pickupLocation: true, dropLocation: true, distance: true, status: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate summary stats
        const totalAmount = earnings.reduce((sum, e) => sum + e.amount, 0);
        const totalDistance = earnings.reduce((sum, e) => sum + e.distance, 0);

        // Group by transporter if no specific filter
        const byTransporter = {};
        if (!transporterId) {
            earnings.forEach(e => {
                const tid = e.transporterId;
                if (!byTransporter[tid]) byTransporter[tid] = { name: e.transporter.transporterProfile?.fullName || 'N/A', amount: 0, count: 0 };
                byTransporter[tid].amount += e.amount;
                byTransporter[tid].count += 1;
            });
        }

        res.json({
            summary: { totalAmount, totalDistance, count: earnings.length },
            earnings,
            byTransporter: Object.values(byTransporter)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Analytics & Reports
const getAnalytics = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Listings per Crop
        const listings = await prisma.listing.groupBy({
            by: ['cropId'],
            _count: { _all: true }
        });

        // Fetch crop names
        const cropIds = listings.map(l => l.cropId);
        const crops = await prisma.crop.findMany({
            where: { id: { in: cropIds } },
            select: { id: true, name: true }
        });
        const cropMap = crops.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});

        const listingsPerCrop = listings.map(l => ({
            name: cropMap[l.cropId] || 'Unknown',
            count: l._count._all
        }));

        // 2. Orders per Day (Last 30 Days)
        const orders = await prisma.order.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true, negotiations: { select: { id: true } } }
        });

        const ordersPerDay = {};
        let negotiatedCount = 0;
        let directCount = 0;

        orders.forEach(o => {
            const date = o.createdAt.toISOString().split('T')[0];
            ordersPerDay[date] = (ordersPerDay[date] || 0) + 1;

            if (o.negotiations && o.negotiations.length > 0) negotiatedCount++;
            else directCount++;
        });

        // Fill missing dates
        const chartDataOrders = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            chartDataOrders.push({ date: dateStr, count: ordersPerDay[dateStr] || 0 });
        }

        // 3. Avg Delivery Time
        const completedDeliveries = await prisma.delivery.findMany({
            where: { status: 'COMPLETED', deliveryTimestamp: { not: null }, pickupTimestamp: { not: null } },
            select: { deliveryTimestamp: true, pickupTimestamp: true }
        });

        const totalDurationMs = completedDeliveries.reduce((sum, d) => {
            return sum + (new Date(d.deliveryTimestamp) - new Date(d.pickupTimestamp));
        }, 0);
        const avgDeliveryTimeHours = completedDeliveries.length ? (totalDurationMs / completedDeliveries.length / (1000 * 60 * 60)).toFixed(1) : 0;

        // 4. Earnings per Transporter (Top 5)
        const earnings = await prisma.earning.findMany({
            include: { transporter: { include: { transporterProfile: true } } }
        });
        const earningsMap = {};
        earnings.forEach(e => {
            const name = e.transporter?.transporterProfile?.fullName || 'Unknown';
            earningsMap[name] = (earningsMap[name] || 0) + e.amount;
        });
        const topEarnings = Object.entries(earningsMap)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        res.json({
            listingsPerCrop,
            ordersPerDay: chartDataOrders,
            avgDeliveryTimeHours,
            negotiationRatio: [
                { name: 'Negotiated', value: negotiatedCount },
                { name: 'Direct Order', value: directCount }
            ],
            topEarnings
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// System Settings
const getSettings = async (req, res) => {
    try {
        const settings = await prisma.systemSetting.findMany();
        const settingsMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
        res.json(settingsMap);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateSettings = async (req, res) => {
    try {
        const updates = req.body;
        const promises = Object.entries(updates).map(([key, value]) =>
            prisma.systemSetting.upsert({
                where: { key },
                update: { value },
                create: { key, value }
            })
        );
        await Promise.all(promises);
        res.json({ message: 'Settings updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const logAdminAction = async (adminId, action, entityType, entityId, details) => {
    try {
        await prisma.adminAuditLog.create({
            data: {
                adminId,
                action,
                entityType,
                entityId,
                details,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error("Audit Log Error:", error);
    }
};

// Audit Logs
const getAuditLogs = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req);
        const [logs, total] = await Promise.all([
            prisma.adminAuditLog.findMany({
                orderBy: { timestamp: 'desc' },
                skip,
                take: limit
            }),
            prisma.adminAuditLog.count()
        ]);

        const adminIds = [...new Set(logs.map(l => l.adminId))];
        const admins = await prisma.user.findMany({
            where: { id: { in: adminIds } },
            select: { id: true, email: true }
        });
        const adminMap = admins.reduce((acc, a) => ({ ...acc, [a.id]: a.email }), {});

        const enrichedLogs = logs.map(l => ({
            ...l,
            adminName: adminMap[l.adminId] || 'Unknown Admin'
        }));

        res.json({
            logs: enrichedLogs,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getDashboardStats,
    getTransporters,
    getUsers,
    updateUserStatus,
    verifyTransporter,
    getCrops,
    createCrop,
    updateCrop,
    getMarketPrices,
    updateMarketPrice,
    createMarketPrice,
    refreshPrices,
    getListings,
    updateListingStatus,
    getOrders,
    cancelOrder,
    reassignTransporter,
    getEarnings,
    getAnalytics,
    getSettings,
    updateSettings,
    getAuditLogs
};
