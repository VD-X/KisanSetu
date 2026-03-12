const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
const { triggerEarningsUpdateAfterCompletion } = require('../services/earningsService');
const { releaseFundsForOrder } = require('../services/walletService'); // Import walletService
const { resolvePickupLocation, resolveDropLocation } = require('../services/locationDefaultsService');
const distanceService = require('../services/distanceService');
const vehicleService = require('../services/vehicleService');

// Vehicle mapping logic moved to backend/src/services/vehicleService.js


// Function to handle location sharing status based on delivery status
const handleLocationSharingStatus = async (deliveryId, newStatus) => {
    let locationSharingUpdate = {};

    switch (newStatus) {
        case 'TRANSPORTER_ASSIGNED':
            // Location sharing already started in acceptDelivery
            break;

        case 'COMPLETED':
        case 'DELIVERED':
            // Stop location sharing when delivery is completed
            locationSharingUpdate = {
                locationSharingEnabled: false,
                locationSharingEnded: new Date()
            };
            break;
    }

    if (Object.keys(locationSharingUpdate).length > 0) {
        await prisma.delivery.update({
            where: { id: deliveryId },
            data: locationSharingUpdate
        });

        console.log(`[LocationSharing] Status updated for delivery ${deliveryId}:`, locationSharingUpdate);
    }
};
const normalizeVehicleType = vehicleService.normalizeVehicleType;

// ... (code)



const MAX_PROOF_PHOTO_BYTES = 2 * 1024 * 1024;

// MongoDB ObjectId must be 24 hex characters; invalid ids cause "Query string malformed"
const isValidObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

const parseImageDataUrl = (imageData) => {
    if (typeof imageData !== 'string') {
        const err = new Error('Invalid image payload');
        err.status = 400;
        throw err;
    }
    const match = imageData.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
        const err = new Error('Unsupported image format');
        err.status = 400;
        throw err;
    }
    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    if (!buffer.length || buffer.length > MAX_PROOF_PHOTO_BYTES) {
        const err = new Error('Image too large');
        err.status = 413;
        throw err;
    }
    return { mimeType, buffer };
};

const formatFarmerUser = (farmer) => {
    const profile = farmer?.farmerProfile;
    return {
        id: farmer?.id,
        name: profile?.fullName || undefined,
        phone: profile?.phone || undefined,
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
        location: profile ? `${profile.city}, ${profile.state}` : undefined
    };
};

const formatBuyerPublic = (buyer) => {
    const profile = buyer?.buyerProfile;
    return {
        id: buyer?.id,
        name: profile?.fullName || undefined,
        location: profile ? `${profile.city}, ${profile.state}` : undefined
    };
};

const formatTransporterUser = (transporter) => {
    const profile = transporter?.transporterProfile;
    return {
        id: transporter?.id,
        name: profile?.fullName || undefined,
        phone: profile?.phone || undefined
    };
};

const redactLocation = (location) => {
    if (!location || typeof location !== 'object') return location;
    const lat = location.lat ?? location.latitude;
    const lng = location.lng ?? location.longitude;
    const out = {
        address: "Location hidden (Accept to view)"
    };
    if (typeof lat === 'number') out.lat = lat;
    if (typeof lng === 'number') out.lng = lng;
    return out;
};

const createEarningIfNeeded = async (deliveryId) => {
    const deal = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        select: { id: true, transporterId: true, distance: true, pricePerKm: true, status: true }
    });
    if (!deal || !deal.transporterId) return null;
    if (String(deal.status || '').toUpperCase() !== 'COMPLETED') return null;

    const amount = Number(deal.distance) * Number(deal.pricePerKm);
    const record = await prisma.earning.upsert({
        where: { deliveryId: deal.id },
        create: {
            deliveryId: deal.id,
            transporterId: deal.transporterId,
            distance: Number(deal.distance),
            pricePerKm: Number(deal.pricePerKm),
            amount
        },
        update: {
            transporterId: deal.transporterId,
            distance: Number(deal.distance),
            pricePerKm: Number(deal.pricePerKm),
            amount
        }
    });
    return record;
};

// Get user's deliveries (Farmer/Buyer/Transporter)
exports.getMyDeliveries = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let whereClause = {};

        if (role === 'FARMER') {
            whereClause = { order: { farmerId: userId } };
        } else if (role === 'BUYER') {
            whereClause = { order: { buyerId: userId } };
        } else if (role === 'TRANSPORTER') {
            whereClause = { transporterId: userId };
        } else {
            return res.status(403).json({ error: 'Unauthorized role' });
        }

        const deals = await prisma.delivery.findMany({
            where: whereClause,
            include: {
                order: {
                    include: {
                        listing: { include: { crop: true } },
                        buyer: { include: { buyerProfile: true } },
                        farmer: { include: { farmerProfile: true } }
                    }
                },
                transporter: { include: { transporterProfile: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = deals.map(d => {
            if (d.order?.farmer) d.order.farmer = formatFarmerUser(d.order.farmer);
            if (d.order?.buyer) d.order.buyer = formatBuyerUser(d.order.buyer);
            if (d.transporter) d.transporter = formatTransporterUser(d.transporter);
            return d;
        });

        res.json({ deliveries: formatted });
    } catch (error) {
        console.error('Get my deliveries error:', error);
        res.status(500).json({ error: 'Failed to fetch deliveries' });
    }
};

// Get delivery by ID
exports.getDeliveryById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid delivery ID', code: 'InvalidQuery' });
        }
        const userId = req.user.id;

        const deal = await prisma.delivery.findUnique({
            where: { id },
            include: {
                order: {
                    include: {
                        listing: { include: { crop: true } },
                        buyer: { include: { buyerProfile: true } },
                        farmer: { include: { farmerProfile: true } }
                    }
                },
                transporter: { include: { transporterProfile: true } }
            }
        });

        if (!deal) {
            return res.status(404).json({ error: 'Delivery deal not found' });
        }

        // Authorization check
        const isAuthorized =
            deal.order.farmerId === userId ||
            deal.order.buyerId === userId ||
            deal.transporterId === userId ||
            req.user.role === 'ADMIN';

        if (!isAuthorized) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Formatting
        if (deal.order?.listing?.farmer) deal.order.listing.farmer = formatFarmerUser(deal.order.listing.farmer);
        if (deal.order?.buyer) deal.order.buyer = formatBuyerUser(deal.order.buyer);
        if (deal.transporter) deal.transporter = formatTransporterUser(deal.transporter);

        // Hide sensitive fields based on role/status
        if (deal.status !== 'PICKED_UP' && deal.status !== 'IN_TRANSIT') {
            // Logic to hide OTPs if needed, though they are usually stripped unless specific conditions met
        }

        // Transporter privacy logic
        if (req.user.role === 'TRANSPORTER') {
            if (deal.order) {
                deal.order.priceFinal = undefined;
                deal.order.totalAmount = undefined;
                if (deal.order.listing) deal.order.listing.pricePerKg = undefined;
            }
        }

        res.json({ deliveryDeal: deal });
    } catch (error) {
        console.error('Get delivery by ID error:', error);
        res.status(500).json({ error: 'Failed to fetch delivery' });
    }
};

// Create delivery deal
exports.createDeliveryDeal = async (req, res) => {
    try {
        const { orderId, pickupLocation, dropLocation, pricePerKm, distance, selectedVehicle, estimatedDuration, price, totalCost: providedTotalCost } = req.body;
        const userId = req.user.id;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                listing: true,
                buyer: { include: { buyerProfile: true } },
                farmer: { include: { farmerProfile: true } }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if user is authorized to create delivery
        const isAuthorized =
            (order.deliveryResponsibility === 'FARMER_ARRANGED' && order.farmerId === userId) ||
            (order.deliveryResponsibility === 'BUYER_ARRANGED' && order.buyerId === userId);

        if (!isAuthorized) {
            return res.status(403).json({ error: 'You are not authorized to arrange delivery for this order' });
        }

        // Check if delivery already exists
        const existingDelivery = await prisma.delivery.findUnique({
            where: { orderId }
        });

        if (existingDelivery) {
            return res.status(400).json({ error: 'Delivery already arranged for this order' });
        }

        // Generate 6-digit OTPs
        const pickupOtp = crypto.randomInt(100000, 999999).toString();
        const deliveryOtp = crypto.randomInt(100000, 999999).toString();

        const totalCost = providedTotalCost || (distance * pricePerKm); // Use provided cost if available

        const farmerProfile = order.farmer?.farmerProfile;
        const buyerProfile = order.buyer?.buyerProfile;

        const resolvedPickup = resolvePickupLocation({ pickupInput: pickupLocation, farmerProfile });
        const resolvedDrop = resolveDropLocation({ dropInput: dropLocation, buyerProfile, order });

        if (!resolvedPickup.address || !resolvedDrop.address) {
            return res.status(400).json({ error: 'Pickup and drop addresses are required. Please update profile location.' });
        }

        // Ensure pickup and drop are not stored with identical coordinates (fixes buyer tracking view)
        if (resolvedPickup.lat !== undefined && resolvedDrop.lat !== undefined &&
            resolvedPickup.lat === resolvedDrop.lat && resolvedPickup.lng === resolvedDrop.lng) {
            delete resolvedPickup.lat;
            delete resolvedPickup.lng;
        }

        // Normalize selected vehicle to ensure consistent matching
        const normalizedSelectedVehicle = normalizeVehicleType(selectedVehicle);
        console.log(`[CreateDeliveryDeal] Normalizing vehicle: '${selectedVehicle}' -> '${normalizedSelectedVehicle}'`);

        const deliveryDeal = await prisma.delivery.create({
            data: {
                orderId,
                pickupLocation: resolvedPickup,
                dropLocation: resolvedDrop,
                pickupOtp,
                deliveryOtp,
                pricePerKm,
                distance,
                totalCost,
                selectedVehicle: normalizedSelectedVehicle,
                estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
                price: price ? parseFloat(price) : null,
                status: 'PENDING_PAYMENT',
                paymentStatus: 'PENDING'
            }
        });

        // Update order status
        await prisma.order.update({
            where: { id: orderId },
            data: { orderStatus: 'DELIVERY_PENDING' }
        });

        const response = {
            message: 'Delivery arrangement created. Please pay to notify transporters.',
            deliveryDeal
        };
        response.deliveryDeal.pickupOtp = undefined;
        response.deliveryDeal.deliveryOtp = undefined;
        if (order.farmerId === userId) response.pickupOtp = pickupOtp;
        if (order.buyerId === userId) response.deliveryOtp = deliveryOtp;

        res.json(response);
    } catch (error) {
        console.error('Create delivery deal error:', error);
        res.status(500).json({ error: 'Failed to create delivery deal' });
    }
};

// Pay for delivery deal
exports.payForDeliveryDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const deal = await prisma.delivery.findUnique({
            where: { id },
            include: { order: true }
        });

        if (!deal) return res.status(404).json({ error: 'Delivery deal not found' });
        if (deal.order.buyerId !== userId) return res.status(403).json({ error: 'Only the buyer can pay for this delivery' });
        if (deal.paymentStatus !== 'PENDING') return res.status(400).json({ error: 'Payment already processed or not pending' });

        const amountToPay = deal.totalCost;

        // Atomic transaction: Deduct from wallet and update delivery status
        const updatedDeal = await prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet || wallet.balance < amountToPay) {
                throw new Error('Insufficient wallet balance');
            }

            // Deduct funds
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: amountToPay } }
            });

            // Create transaction record
            await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    amount: amountToPay,
                    type: 'DEBIT',
                    description: `Payment for Delivery #${deal.id.slice(-6)}`,
                    orderId: deal.orderId,
                    status: 'SUCCESS'
                }
            });

            // Update delivery deal
            return await tx.delivery.update({
                where: { id: deal.id },
                data: {
                    paymentStatus: 'HELD',
                    status: 'WAITING_FOR_TRANSPORTER'
                }
            });
        });

        // Emit WebSocket event for new delivery deal (now that it's paid and available)
        if (req.app.get('io')) {
            const io = req.app.get('io');
            const safeDeal = {
                id: updatedDeal.id,
                orderId: updatedDeal.orderId,
                status: updatedDeal.status,
                pricePerKm: updatedDeal.pricePerKm,
                distance: updatedDeal.distance,
                totalCost: updatedDeal.totalCost,
                selectedVehicle: updatedDeal.selectedVehicle,
                estimatedDuration: updatedDeal.estimatedDuration,
                price: updatedDeal.price,
                pickupLocation: redactLocation(updatedDeal.pickupLocation),
                dropLocation: redactLocation(updatedDeal.dropLocation)
            };

            // Create persistent notifications for relevant transporters
            if (updatedDeal.selectedVehicle) {
                try {
                    const matchingTransporters = await prisma.transporterProfile.findMany({
                        where: {
                            vehicleType: updatedDeal.selectedVehicle,
                            approvalStatus: 'APPROVED'
                        },
                        select: { userId: true }
                    });

                    if (matchingTransporters.length > 0) {
                        const notificationData = matchingTransporters.map(t => ({
                            userId: t.userId,
                            title: '📦 New Delivery Available',
                            message: `A new ${updatedDeal.selectedVehicle} delivery is available! ₹${updatedDeal.totalCost} for ${updatedDeal.distance}km.`,
                            type: 'new_delivery_available',
                            deliveryId: updatedDeal.id,
                            createdAt: new Date()
                        }));

                        await prisma.notification.createMany({
                            data: notificationData
                        });
                    }
                } catch (err) {
                    console.error('[Notification] Failed to create notifications for transporters:', err);
                }

                // Emit WebSocket event for new delivery deal (now that it's paid and available)
                const roomName = vehicleService.getVehicleRoomName(updatedDeal.selectedVehicle);
                if (roomName) {
                    io.to(roomName).emit('delivery:created', { deliveryDeal: safeDeal });
                    console.log(`[PayForDelivery] Notification sent to room ${roomName} for vehicle type ${updatedDeal.selectedVehicle}`);
                }
            }
            io.to('delivery-deals').emit('delivery:created', { deliveryDeal: safeDeal });
        }

        res.json({ message: 'Payment successful! Transporters have been notified.', deliveryDeal: updatedDeal });
    } catch (error) {
        console.error('Pay for delivery error:', error);
        res.status(error.message === 'Insufficient wallet balance' ? 400 : 500).json({ error: error.message });
    }
};

// Helper to calculate distance in km - deprecated, use distanceService.haversineDistance
// const getDistanceFromLatLonInKm = ... (removed)


// Get available deals for transporters
exports.getAvailableDeals = async (req, res) => {
    try {
        const { latitude, longitude } = req.query;
        // Prevent Express ETag caching which can serve stale 304 responses
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        console.log(`[AvailableDeals] Fetching deals for transporter ${req.user.id}. Live Loc: ${latitude}, ${longitude}`);

        if (req.user.role !== 'TRANSPORTER') {
            return res.status(403).json({ error: 'Only transporters can view available deals' });
        }

        const transporterProfile = await prisma.transporterProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!transporterProfile) {
            console.warn(`[AvailableDeals] Transporter profile missing for user ${req.user.id}`);
            return res.status(400).json({ error: 'Transporter profile not found' });
        }

        console.log(`[AvailableDeals] Found transporter profile: vehicle=${transporterProfile.vehicleType}, range=${transporterProfile.serviceRange}`);

        // Normalize transporter's vehicle type for better matching
        const normalizedTransporterVehicleType = normalizeVehicleType(transporterProfile.vehicleType);
        console.log(`[AvailableDeals] Normalized vehicle type: ${normalizedTransporterVehicleType}`);

        // Match compatible vehicles based on mapping
        const compatibleVehicles = vehicleService.VEHICLE_TYPE_MAPPING[normalizedTransporterVehicleType] || [normalizedTransporterVehicleType];
        // Ensure both the normalized name and its variations are included
        const vehicleSearchTerms = Array.from(new Set([normalizedTransporterVehicleType, ...compatibleVehicles]));

        console.log(`[AvailableDeals] Searching for deals. Transporter: ${req.user.id}, Vehicle: ${normalizedTransporterVehicleType}. Search Terms: ${vehicleSearchTerms.join(', ')}`);

        // DEEP DIAGNOSTICS: Check counts for each filter part
        const countStatus = await prisma.delivery.count({ where: { status: 'WAITING_FOR_TRANSPORTER' } });
        const countPayment = await prisma.delivery.count({ where: { paymentStatus: 'HELD' } });
        const countCombined = await prisma.delivery.count({ where: { status: 'WAITING_FOR_TRANSPORTER', paymentStatus: 'HELD' } });
        const countNoTransporter = await prisma.delivery.count({ where: { status: 'WAITING_FOR_TRANSPORTER', paymentStatus: 'HELD', transporterId: null } });
        const countWithVehicle = await prisma.delivery.count({
            where: {
                status: 'WAITING_FOR_TRANSPORTER',
                paymentStatus: 'HELD',
                transporterId: null,
                selectedVehicle: { in: vehicleSearchTerms }
            }
        });

        console.log(`[AvailableDeals] GRANULAR COUNTS:`);
        console.log(`- status=WAITING: ${countStatus}`);
        console.log(`- payment=HELD: ${countPayment}`);
        console.log(`- WAITING + HELD: ${countCombined}`);
        console.log(`- + transporterId=null: ${countNoTransporter}`);
        console.log(`- + vehicle match: ${countWithVehicle}`);

        // Check if the transporter has declined anything
        const declinedCount = await prisma.delivery.count({ where: { declinedBy: { has: req.user.id } } });
        console.log(`- Transporter ${req.user.id} has declined ${declinedCount} deals.`);

        // Specific check for IDs seen in user logs
        const knownIds = ["6998a108ef49cbf353509b08", "6999dfd21b2bc5c8fe861f1d"];
        for (const kid of knownIds) {
            const d = await prisma.delivery.findUnique({ where: { id: kid } });
            if (d) {
                console.log(`[AvailableDeals] DEBUG DEAL ${kid}: status=${d.status}, payment=${d.paymentStatus}, vehicle=${d.selectedVehicle}, tId=${d.transporterId}, declinedBy=[${d.declinedBy.join(',')}]`);
            }
        }

        // Debug: Check if any deals exist in the pool at all
        const allPendingCount = await prisma.delivery.count({
            where: { status: 'WAITING_FOR_TRANSPORTER' }
        });
        const allHeldCount = await prisma.delivery.count({
            where: { paymentStatus: 'HELD' }
        });
        const allDealsCount = await prisma.delivery.count();
        console.log(`[AvailableDeals] POOL STATS: Total status=WAITING: ${allPendingCount}, Total status=HELD: ${allHeldCount}, Grand Total: ${allDealsCount}`);

        if (allDealsCount > 0) {
            const sampleDeals = await prisma.delivery.findMany({
                where: {
                    OR: [
                        { status: 'WAITING_FOR_TRANSPORTER' },
                        { status: 'PENDING_PAYMENT' }
                    ]
                },
                take: 10,
                select: { id: true, selectedVehicle: true, paymentStatus: true, status: true, transporterId: true }
            });
            console.log(`[AvailableDeals] INSPECTING DEALS:`, JSON.stringify(sampleDeals, null, 2));
        }

        // Fetch ALL paid WAITING deals - filter vehicle, declinedBy, transporterId in JS
        // This avoids multiple Prisma+MongoDB quirks with OR/in/NOT/null on arrays/nullable fields
        const deals = await prisma.delivery.findMany({
            where: {
                paymentStatus: 'HELD',
                status: 'WAITING_FOR_TRANSPORTER',
            },

            include: {
                order: {
                    include: {
                        listing: {
                            include: {
                                crop: true,
                                farmer: {
                                    include: { farmerProfile: true }
                                }
                            }
                        },
                        buyer: {
                            include: { buyerProfile: true }
                        }
                    }
                },
                transporter: {
                    include: { transporterProfile: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`[AvailableDeals] Raw DB result: ${deals.length} HELD+WAITING deals found`);

        // Apply all filtering in JavaScript to avoid Prisma+MongoDB quirks
        const vehicleSearchTermsLower = vehicleSearchTerms.map(v => v.toLowerCase());

        const filteredByRelev = deals.filter(d => {
            // 1. Must not already be assigned to a transporter
            if (d.transporterId !== null) return false;
            // 2. Must match vehicle type (case-insensitive)
            const dealVehicle = (d.selectedVehicle || '').toLowerCase();
            if (!vehicleSearchTermsLower.includes(dealVehicle)) {
                console.log(`[AvailableDeals] Deal ${d.id} vehicle "${d.selectedVehicle}" not in [${vehicleSearchTerms.join(', ')}]`);
                return false;
            }
            // 3. Must not have been declined by this transporter
            if (d.declinedBy?.includes(req.user.id)) return false;
            return true;
        });

        console.log(`[AvailableDeals] After JS filters (vehicle+transporter+declined): ${filteredByRelev.length} deals match`);

        // Filter by Service Range
        const serviceRange = parseFloat(transporterProfile.serviceRange || 0);
        // Prioritize live GPS location from query params over static profile location
        const driverLat = latitude ? parseFloat(latitude) : transporterProfile.latitude;
        const driverLng = longitude ? parseFloat(longitude) : transporterProfile.longitude;

        const filteredDeals = filteredByRelev.map(d => {
            // Always show my own accepted/assigned deals
            if (d.transporterId === req.user.id) {
                return { ...d, pickupDistance: 0 };
            }


            // For available deals, check range and calculate distance
            let pickupDistance = null;
            if (driverLat && driverLng) {
                const pickupLat = d.pickupLocation?.lat || d.pickupLocation?.latitude || d.order?.listing?.farmer?.farmerProfile?.latitude;
                const pickupLng = d.pickupLocation?.lng || d.pickupLocation?.longitude || d.order?.listing?.farmer?.farmerProfile?.longitude;

                if (pickupLat && pickupLng) {
                    try {
                        pickupDistance = distanceService.haversineDistance(driverLat, driverLng, pickupLat, pickupLng);
                        console.log(`[AvailableDeals] Distance for deal ${d.id}: ${pickupDistance.toFixed(2)}km`);
                    } catch (e) {
                        console.error(`[AvailableDeals] Distance calculation failed for deal ${d.id}:`, e.message);
                    }
                } else {
                    console.warn(`[AvailableDeals] Missing pickup coordinates for deal ${d.id}`);
                }
            } else {
                console.log(`[AvailableDeals] Skipping distance check for deal ${d.id} (driver location missing)`);
            }

            // If it's waiting for a transporter, apply the service range filter if configured
            if (d.status === 'WAITING_FOR_TRANSPORTER' && serviceRange > 0 && pickupDistance !== null) {
                if (pickupDistance > serviceRange) {
                    console.log(`[AvailableDeals] Deal ${d.id} is out of range (${pickupDistance.toFixed(1)}km > ${serviceRange}km).`);
                    return null; // Will be filtered out
                }
            }

            return { ...d, pickupDistance: pickupDistance !== null ? Number(pickupDistance.toFixed(1)) : null };
        }).filter(d => d !== null);

        console.log(`[AvailableDeals] Returning ${filteredDeals.length} deals for transporter.`);

        const formatted = filteredDeals.map(d => {
            try {
                // Formatting for display - addresses are NO LONGER redacted as per user request
                const isOpenPool = d.status === 'WAITING_FOR_TRANSPORTER' && !d.transporterId;

                // Keep private formatting for privacy but DON'T REDACT locations anymore
                if (d.order?.listing?.farmer) d.order.listing.farmer = isOpenPool ? formatFarmerPublic(d.order.listing.farmer) : formatFarmerUser(d.order.listing.farmer);
                if (d.order?.buyer) d.order.buyer = isOpenPool ? formatBuyerPublic(d.order.buyer) : formatBuyerUser(d.order.buyer);
                if (d.transporter) d.transporter = formatTransporterUser(d.transporter);

                // addresses are visible now
                // d.pickupLocation = isOpenPool ? redactLocation(d.pickupLocation) : d.pickupLocation;
                // d.dropLocation = isOpenPool ? redactLocation(d.dropLocation) : d.dropLocation;

                d.pickupOtp = undefined;
                d.deliveryOtp = undefined;

                // Transporter View Protection: Remove Order/Listing Price Details if user is Transporter
                if (req.user.role === 'TRANSPORTER') {
                    if (d.order) {
                        d.order.priceFinal = undefined;
                        d.order.totalAmount = undefined;
                        if (d.order.listing) {
                            d.order.listing.pricePerKg = undefined;
                        }
                    }
                }
                return d;
            } catch (err) {
                console.error(`[AvailableDeals] Error formatting deal ${d.id}:`, err);
                return d;
            }
        });

        res.json({ deals: formatted });
    } catch (error) {
        console.error('[AvailableDeals] CRITICAL ERROR:', error);
        res.status(500).json({ error: 'Failed to fetch available deals', details: error.message });
    }
};

// Accept delivery deal
exports.acceptDeal = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid delivery ID', code: 'InvalidQuery' });
        }
        const transporterId = req.user.id;

        if (req.user.role !== 'TRANSPORTER') {
            return res.status(403).json({ error: 'Only transporters can accept deals' });
        }

        const deal = await prisma.delivery.findUnique({
            where: { id },
            select: { id: true, orderId: true, transporterId: true, status: true }
        });

        if (!deal) {
            return res.status(404).json({ error: 'Delivery deal not found' });
        }

        const claimed = await prisma.delivery.updateMany({
            where: {
                id,
                status: 'WAITING_FOR_TRANSPORTER'
            },
            data: {
                transporterId,
                status: 'TRANSPORTER_ASSIGNED',
                // Start location sharing immediately when deal is accepted
                locationSharingEnabled: true,
                locationSharingStarted: new Date()
            }
        });

        if (claimed.count === 0) {
            return res.status(400).json({ error: 'Deal already accepted by another transporter' });
        }

        const updatedDeal = await prisma.delivery.findUnique({
            where: { id },
            include: {
                order: {
                    include: {
                        listing: { include: { crop: true } },
                        buyer: { include: { buyerProfile: true } },
                        farmer: { include: { farmerProfile: true } }
                    }
                },
                transporter: {
                    include: { transporterProfile: true }
                }
            }
        });

        if (updatedDeal) {
            if (updatedDeal.order?.buyer) updatedDeal.order.buyer = formatBuyerUser(updatedDeal.order.buyer);
            if (updatedDeal.order?.farmer) updatedDeal.order.farmer = formatFarmerUser(updatedDeal.order.farmer);
            if (updatedDeal.transporter) updatedDeal.transporter = formatTransporterUser(updatedDeal.transporter);
            updatedDeal.pickupOtp = undefined;
            updatedDeal.deliveryOtp = undefined;

            // Transporter View Protection
            if (req.user.role === 'TRANSPORTER') {
                if (updatedDeal.order) {
                    updatedDeal.order.priceFinal = undefined;
                    updatedDeal.order.totalAmount = undefined;
                    if (updatedDeal.order.listing) {
                        updatedDeal.order.listing.pricePerKg = undefined;
                    }
                }
            }
        }

        // Emit WebSocket event
        if (req.app.get('io')) {
            const io = req.app.get('io');

            // Create persistent notifications for Farmer and Buyer
            try {
                const order = await prisma.order.findUnique({
                    where: { id: deal.orderId },
                    select: { farmerId: true, buyerId: true, listing: { include: { crop: true } } }
                });

                if (order) {
                    const transporterName = updatedDeal.transporter?.transporterProfile?.fullName || 'A transporter';
                    const cropName = order.listing?.crop?.name || 'order';

                    await prisma.notification.createMany({
                        data: [
                            {
                                userId: order.farmerId,
                                title: '🚚 Transporter Assigned',
                                message: `${transporterName} has been assigned to pick up your ${cropName}.`,
                                type: 'transporter_assigned',
                                deliveryId: updatedDeal.id,
                                createdAt: new Date()
                            },
                            {
                                userId: order.buyerId,
                                title: '🚚 Transporter Assigned',
                                message: `${transporterName} has been assigned to deliver your ${cropName}.`,
                                type: 'transporter_assigned',
                                deliveryId: updatedDeal.id,
                                createdAt: new Date()
                            }
                        ]
                    });
                }
            } catch (err) {
                console.error('[Notification] Failed to create assignment notifications:', err);
            }

            // Notify specific order room (Farmer/Buyer)
            io.to(`order-${deal.orderId}`).emit('delivery:accepted', {
                deliveryDeal: updatedDeal
            });

            // Notify vehicle room (Other Transporters) - Remove from their list
            if (updatedDeal.selectedVehicle) {
                io.to(`vehicle-${updatedDeal.selectedVehicle}`).emit('delivery:taken', {
                    dealId: updatedDeal.id
                });
            }
        }

        res.json({ message: 'Deal accepted successfully', deliveryDeal: updatedDeal });
    } catch (error) {
        console.error('Accept deal error:', error);
        res.status(500).json({ error: 'Failed to accept deal' });
    }
};

// Decline delivery deal (Transporter only)
exports.declineDeal = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid delivery ID', code: 'InvalidQuery' });
        }
        const transporterId = req.user.id;

        if (req.user.role !== 'TRANSPORTER') {
            return res.status(403).json({ error: 'Only transporters can decline deals' });
        }

        const deal = await prisma.delivery.findUnique({
            where: { id }
        });

        if (!deal) {
            return res.status(404).json({ error: 'Delivery deal not found' });
        }

        if (deal.status !== 'WAITING_FOR_TRANSPORTER' || deal.transporterId) {
            return res.status(400).json({ error: 'Deal is not available to decline' });
        }

        const declinedBy = Array.isArray(deal.declinedBy) ? deal.declinedBy : [];
        if (declinedBy.includes(transporterId)) {
            return res.json({ message: 'Deal already declined' });
        }

        await prisma.delivery.update({
            where: { id },
            data: { declinedBy: [...declinedBy, transporterId] }
        });

        res.json({ message: 'Deal declined' });
    } catch (error) {
        console.error('Decline deal error:', error);
        res.status(500).json({ error: 'Failed to decline deal' });
    }
};

exports.uploadProofPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid delivery ID', code: 'InvalidQuery' });
        }
        const transporterId = req.user.id;
        const { imageData } = req.body;

        const deal = await prisma.delivery.findUnique({
            where: { id },
            select: { id: true, orderId: true, transporterId: true, status: true, proofPhotos: true }
        });

        if (!deal) {
            return res.status(404).json({ error: 'Delivery deal not found' });
        }

        if (deal.transporterId !== transporterId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (!['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(String(deal.status || '').toUpperCase())) {
            return res.status(400).json({ error: 'Invalid status for proof upload' });
        }

        parseImageDataUrl(imageData);

        const existing = Array.isArray(deal.proofPhotos) ? deal.proofPhotos : [];
        const next = [...existing, imageData].slice(-3);

        const updatedDeal = await prisma.delivery.update({
            where: { id },
            data: { proofPhotos: next }
        });

        updatedDeal.pickupOtp = undefined;
        updatedDeal.deliveryOtp = undefined;

        if (req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`order-${deal.orderId}`).emit('delivery:proof-photo-uploaded', {
                deliveryDeal: updatedDeal
            });
        }

        res.json({ message: 'Proof photo uploaded', deliveryDeal: updatedDeal });
    } catch (error) {
        const status = error?.status || error?.statusCode;
        if (status) {
            return res.status(status).json({ error: error.message || 'Invalid image upload' });
        }
        console.error('Upload proof photo error:', error);
        res.status(500).json({ error: 'Failed to upload proof photo' });
    }
};

// Verify OTP (Pickup or Delivery)
exports.verifyOtp = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid delivery ID', code: 'InvalidQuery' });
        }
        const { otp } = req.body;
        const transporterId = req.user.id;

        const deal = await prisma.delivery.findUnique({
            where: { id }
        });

        if (!deal) {
            return res.status(404).json({ error: 'Delivery deal not found' });
        }

        if (deal.transporterId !== transporterId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let updateData = {};
        let orderStatus = '';
        let listingStatus = '';
        let otpType = '';

        // Determine verification type based on current status
        if (deal.status === 'TRANSPORTER_ASSIGNED' || deal.status === 'ACCEPTED') {
            // Pickup Verification
            if (deal.pickupOtp !== otp) {
                return res.status(400).json({ error: 'Invalid Pickup OTP' });
            }
            updateData = {
                status: 'PICKED_UP',
                pickupTimestamp: new Date()
            };
            orderStatus = 'IN_DELIVERY';
            listingStatus = 'IN_DELIVERY';
            otpType = 'PICKUP';

        } else if (deal.status === 'IN_TRANSIT' || deal.status === 'PICKED_UP' || deal.status === 'OUT_FOR_DELIVERY') {
            // Delivery Verification (Allow verification from PICKED_UP or OUT_FOR_DELIVERY directly)
            if (deal.deliveryOtp !== otp) {
                return res.status(400).json({ error: 'Invalid Delivery OTP' });
            }
            updateData = {
                status: 'COMPLETED',
                deliveryTimestamp: new Date()
            };
            orderStatus = 'COMPLETED';
            listingStatus = 'SOLD';
            otpType = 'DELIVERY';
        } else {
            return res.status(400).json({ error: 'Invalid status for OTP verification' });
        }

        const updatedDeal = await prisma.delivery.update({
            where: { id },
            data: {
                ...updateData,
                paymentStatus: updateData.status === 'COMPLETED' ? 'RELEASED' : undefined
            }
        });

        // Handle location sharing status based on new delivery status
        await handleLocationSharingStatus(id, updateData.status);

        updatedDeal.pickupOtp = undefined;
        updatedDeal.deliveryOtp = undefined;

        // Update order status
        if (orderStatus) {
            await prisma.order.update({
                where: { id: deal.orderId },
                data: { orderStatus }
            });
        }

        // Update listing status
        if (listingStatus) {
            const order = await prisma.order.findUnique({
                where: { id: deal.orderId }
            });
            await prisma.listing.update({
                where: { id: order.listingId },
                data: { status: listingStatus }
            });
        }

        // Create persistent notifications for Pickup
        if (updateData.status === 'PICKED_UP') {
            try {
                const order = await prisma.order.findUnique({
                    where: { id: deal.orderId },
                    select: { farmerId: true, buyerId: true, listing: { include: { crop: true } } }
                });

                if (order) {
                    const cropName = order.listing?.crop?.name || 'order';
                    await prisma.notification.createMany({
                        data: [
                            {
                                userId: order.farmerId,
                                title: '📦 Package Picked Up',
                                message: `Your ${cropName} has been picked up by the transporter.`,
                                type: 'pickup_confirmed',
                                deliveryId: updatedDeal.id,
                                createdAt: new Date()
                            },
                            {
                                userId: order.buyerId,
                                title: '🚚 Order on the Way',
                                message: `Your ${cropName} has been picked up and is on its way!`,
                                type: 'pickup_confirmed',
                                deliveryId: updatedDeal.id,
                                createdAt: new Date()
                            }
                        ]
                    });
                }
            } catch (err) {
                console.error('[Notification] Failed to create pickup notifications:', err);
            }
        }

        // Emit WebSocket event
        if (req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`order-${deal.orderId}`).emit('delivery:otp-verified', {
                deliveryDeal: updatedDeal
                , type: otpType
            });

            // Send out for delivery notification to all buyers when transporter is within 5km
            if (updateData.status === 'OUT_FOR_DELIVERY') {
                io.emit('notification', {
                    type: 'out_for_delivery',
                    userId: 'all_buyers',
                    title: 'Out For Delivery!',
                    message: `Transporter is out for delivery with ${updatedDeal.order?.listing?.crop?.name || 'order'}. Track your order in real-time.`,
                    deliveryId: deal.id,
                    data: {
                        deliveryDeal: updatedDeal,
                        crop: updatedDeal.order?.listing?.crop
                    }
                });
            }

            if (updateData.status === 'COMPLETED') {
                try {
                    await triggerEarningsUpdateAfterCompletion(updatedDeal.id, io);
                    // Release remaining funds (Farmer) and update status
                    await releaseFundsForOrder(deal.orderId, io);
                } catch (e) {
                    console.error('Earnings update or Fund release failed after completion:', e);
                }

                // Create persistent notifications for Farmer and Buyer
                try {
                    const order = await prisma.order.findUnique({
                        where: { id: deal.orderId },
                        select: { farmerId: true, buyerId: true, listing: { include: { crop: true } } }
                    });

                    if (order) {
                        const cropName = order.listing?.crop?.name || 'order';
                        await prisma.notification.createMany({
                            data: [
                                {
                                    userId: order.farmerId,
                                    title: '✅ Delivery Completed!',
                                    message: `The delivery of ${cropName} is complete. Payment released.`,
                                    type: 'delivery_completed',
                                    deliveryId: updatedDeal.id,
                                    createdAt: new Date()
                                },
                                {
                                    userId: order.buyerId,
                                    title: '✅ Delivery Completed!',
                                    message: `Your ${cropName} has been successfully delivered.`,
                                    type: 'delivery_completed',
                                    deliveryId: updatedDeal.id,
                                    createdAt: new Date()
                                }
                            ]
                        });
                    }
                } catch (err) {
                    console.error('[Notification] Failed to create completion notifications:', err);
                }

                // Send notification to farmer when delivery is completed
                io.to(`order-${deal.orderId}`).emit('notification', {
                    type: 'delivery_completed',
                    userId: deal.order?.farmerId,
                    title: 'Delivery Completed!',
                    message: `Your ${updatedDeal.order?.listing?.crop?.name || 'order'} has been successfully delivered. Payment will be processed soon.`,
                    deliveryId: deal.id,
                    data: {
                        deliveryDeal: updatedDeal,
                        crop: updatedDeal.order?.listing?.crop
                    }
                });
            }
        }

        res.json({ message: 'OTP verified successfully', deliveryDeal: updatedDeal });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

// Update delivery status
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid delivery ID', code: 'InvalidQuery' });
        }
        const { status } = req.body;
        const transporterId = req.user.id;

        const deal = await prisma.delivery.findUnique({
            where: { id }
        });

        if (!deal) {
            return res.status(404).json({ error: 'Delivery deal not found' });
        }

        if (deal.transporterId !== transporterId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Validate status transitions
        const validTransitions = {
            'TRANSPORTER_ASSIGNED': ['PICKED_UP'],
            'PICKED_UP': ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'],
            'IN_TRANSIT': ['OUT_FOR_DELIVERY', 'DELIVERED'],
            'OUT_FOR_DELIVERY': ['DELIVERED', 'COMPLETED'],
            'DELIVERED': ['COMPLETED']
        };

        if (!validTransitions[deal.status]?.includes(status)) {
            // return res.status(400).json({ error: 'Invalid status transition' });
            // Allow flexibility for demo purposes, but log it
            console.warn(`Invalid transition attempted: ${deal.status} -> ${status}`);
        }

        const updateData = { status };

        if (status === 'OUT_FOR_DELIVERY') {
            // Fetch order and buyer details for notification
            const order = await prisma.order.findUnique({
                where: { id: deal.orderId },
                include: { listing: { include: { crop: true } } }
            });

            if (order) {
                // Create persistent notification
                await prisma.notification.create({
                    data: {
                        userId: order.buyerId,
                        title: 'Order Out for Delivery',
                        message: `Your order for ${order.listing.crop.name} is now out for delivery! Please be alert to receive it.`,
                        type: 'out_for_delivery',
                        chatId: deal.orderId,
                        createdAt: new Date()
                    }
                }).catch(err => console.error('Failed to create notification:', err));

                // Real-time socket notification is handled below in the WebSocket event section
            }
        }

        if (status === 'DELIVERED') {
            updateData.deliveryTimestamp = new Date();
        }

        const updatedDeal = await prisma.delivery.update({
            where: { id },
            data: updateData
        });

        // Handle location sharing status based on new delivery status
        await handleLocationSharingStatus(id, status);

        updatedDeal.pickupOtp = undefined;
        updatedDeal.deliveryOtp = undefined;

        // Update order status
        if (status === 'COMPLETED' || status === 'DELIVERED') {
            const newOrderStatus = status === 'DELIVERED' ? 'COMPLETED' : 'COMPLETED'; // Map DELIVERED to COMPLETED order status for simplicity
            await prisma.order.update({
                where: { id: deal.orderId },
                data: { orderStatus: newOrderStatus }
            });

            // Update listing status
            const order = await prisma.order.findUnique({
                where: { id: deal.orderId }
            });

            await prisma.listing.update({
                where: { id: order.listingId },
                data: { status: 'SOLD' }
            });
        }

        // Emit WebSocket event
        if (req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`order-${deal.orderId}`).emit('delivery:status-update', {
                deliveryDeal: updatedDeal
            });

            if (status === 'COMPLETED' || status === 'DELIVERED') {
                if (status === 'COMPLETED') {
                    try {
                        await triggerEarningsUpdateAfterCompletion(updatedDeal.id, io);
                    } catch (e) {
                        console.error('Earnings update failed after completion:', e);
                    }
                }
                io.to(`order-${deal.orderId}`).emit('delivery:completed', {
                    deliveryDeal: updatedDeal
                });
            }
        }

        res.json({ message: 'Status updated successfully', deliveryDeal: updatedDeal });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
};

// Get delivery tracking data
exports.getTracking = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid delivery ID', code: 'InvalidQuery' });
        }
        const userId = req.user.id;

        const deal = await prisma.delivery.findUnique({
            where: { id },
            include: {
                order: {
                    include: {
                        listing: { include: { crop: true } },
                        buyer: { include: { buyerProfile: true } },
                        farmer: { include: { farmerProfile: true } }
                    }
                },
                transporter: {
                    include: { transporterProfile: true }
                }
            }
        });

        if (!deal) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        // Check authorization
        const isAuthorized =
            deal.order.buyerId === userId ||
            deal.order.farmerId === userId ||
            deal.transporterId === userId;

        if (!isAuthorized) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (deal.order?.buyer) deal.order.buyer = formatBuyerUser(deal.order.buyer);
        if (deal.order?.farmer) deal.order.farmer = formatFarmerUser(deal.order.farmer);
        if (deal.transporter) deal.transporter = formatTransporterUser(deal.transporter);

        // Transporter View Protection
        if (req.user.role === 'TRANSPORTER') {
            if (deal.order) {
                deal.order.priceFinal = undefined;
                deal.order.totalAmount = undefined;
                if (deal.order.listing) {
                    deal.order.listing.pricePerKg = undefined;
                }
            }
        }

        res.json({ deliveryDeal: deal });
    } catch (error) {
        console.error('Get tracking error:', error);
        res.status(500).json({ error: 'Failed to fetch tracking data' });
    }
};

// Start location sharing for a delivery (for existing active orders)
exports.startLocationSharing = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Find the delivery with related order
        const delivery = await prisma.delivery.findUnique({
            where: { id },
            include: {
                order: {
                    include: {
                        farmer: true,
                        buyer: true
                    }
                },
                transporter: true
            }
        });

        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        // Check if user is authorized (farmer or buyer of the order)
        const isAuthorized = delivery.order.farmerId === userId || delivery.order.buyerId === userId;
        if (!isAuthorized) {
            return res.status(403).json({ error: 'Not authorized to start location sharing for this delivery' });
        }

        // Check if delivery is active
        const activeStatuses = ['TRANSPORTER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];
        if (!activeStatuses.includes(delivery.status)) {
            return res.status(400).json({
                error: 'Delivery is not in an active status for location sharing',
                currentStatus: delivery.status,
                activeStatuses
            });
        }

        // Check if transporter is assigned
        if (!delivery.transporterId) {
            return res.status(400).json({ error: 'No transporter assigned to this delivery' });
        }

        // Enable location sharing if not already enabled
        if (!delivery.locationSharingEnabled) {
            const updatedDelivery = await prisma.delivery.update({
                where: { id },
                data: {
                    locationSharingEnabled: true,
                    locationSharingStarted: new Date()
                }
            });

            console.log(`[LocationSharing] Manually started for delivery ${id} by user ${userId}`);

            res.json({
                success: true,
                message: 'Location sharing started successfully',
                delivery: {
                    id: updatedDelivery.id,
                    locationSharingEnabled: updatedDelivery.locationSharingEnabled,
                    locationSharingStarted: updatedDelivery.locationSharingStarted,
                    status: updatedDelivery.status,
                    transporter: updatedDelivery.transporter
                }
            });
        } else {
            res.json({
                success: true,
                message: 'Location sharing is already enabled',
                delivery: {
                    id: delivery.id,
                    locationSharingEnabled: delivery.locationSharingEnabled,
                    locationSharingStarted: delivery.locationSharingStarted,
                    status: delivery.status,
                    transporter: delivery.transporter
                }
            });
        }

    } catch (error) {
        console.error('Error starting location sharing:', error);
        res.status(500).json({ error: 'Failed to start location sharing' });
    }
};
exports.updateTransporterLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { lat, lng } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        // Get delivery details to check sharing status
        const delivery = await prisma.delivery.findUnique({
            where: { id },
            select: {
                id: true,
                orderId: true,
                status: true,
                locationSharingEnabled: true,
                transporterId: true
            }
        });

        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        // Check if user is the assigned transporter
        if (delivery.transporterId !== req.user.id) {
            return res.status(403).json({ error: 'Only assigned transporter can update location' });
        }

        // Only update location if sharing is enabled
        if (delivery.locationSharingEnabled) {
            const updatedDelivery = await prisma.delivery.update({
                where: { id },
                data: {
                    transporterLocation: { lat, lng },
                    lastLocationUpdate: new Date()
                }
            });

            // Broadcast location to buyer and farmer via WebSocket
            const io = req.app.get('io');
            if (io) {
                // Broadcast to order room for buyer/farmer tracking
                io.to(`order-${delivery.orderId}`).emit('locationUpdate', {
                    lat,
                    lng,
                    timestamp: new Date(),
                    deliveryId: id
                });

                // Also broadcast to tracking room for compatibility
                io.to(`tracking-${id}`).emit('location-updated', { lat, lng });

                console.log(`[LocationUpdate] Broadcasted location for delivery ${id} to order room ${delivery.orderId} and tracking room ${id}`);
            }

            res.json({
                message: 'Location updated and shared',
                location: { lat, lng },
                sharingEnabled: true
            });
        } else {
            res.json({
                message: 'Location sharing is disabled',
                sharingEnabled: false
            });
        }

    } catch (error) {
        console.error('Update transporter location error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
};

module.exports = exports;
