const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
const { releaseFundsForOrder } = require('../services/walletService');

// Create order (from cart or negotiation)
exports.createOrder = async (req, res) => {
    try {
        const { listingId, quantity, priceFinal, deliveryResponsibility, negotiationId, paymentMethod, platformFee, farmerAmount, transporterAmount } = req.body;
        const buyerId = req.user.id;

        if (req.user.role !== 'BUYER') {
            return res.status(403).json({ error: 'Only buyers can create orders' });
        }

        if (!/^[0-9a-fA-F]{24}$/.test(listingId)) {
            return res.status(400).json({ error: 'Invalid listing ID' });
        }

        if (negotiationId && !/^[0-9a-fA-F]{24}$/.test(negotiationId)) {
            return res.status(400).json({ error: 'Invalid negotiation ID' });
        }

        const listing = await prisma.listing.findUnique({
            where: { id: listingId }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        if (listing.status !== 'AVAILABLE') {
            return res.status(400).json({ error: 'Listing is no longer available' });
        }

        if (listing.quantity < qty) {
            return res.status(400).json({ error: `Insufficient quantity. Only ${listing.quantity} available.` });
        }

        if (negotiationId) {
            const chat = await prisma.negotiatingChat.findUnique({
                where: { id: negotiationId }
            });
            if (!chat) return res.status(404).json({ error: 'Negotiation not found' });
            if (chat.buyerId !== buyerId) return res.status(403).json({ error: 'Unauthorized negotiation access' });
            if (chat.listingId !== listingId) return res.status(400).json({ error: 'Negotiation does not match listing' });
            if (String(chat.status || '').toUpperCase() !== 'OPEN') return res.status(400).json({ error: 'Negotiation is not open' });
        }

        const order = await prisma.order.create({
            data: {
                listingId,
                buyerId,
                farmerId: listing.farmerId,
                quantity: qty,
                priceFinal,
                deliveryResponsibility: deliveryResponsibility || 'FARMER_ARRANGED',
                orderStatus: 'ORDER_CREATED',

                // Payment & Escrow Fields
                paymentStatus: 'HELD', // Funds held in escrow
                paymentMethod: paymentMethod || 'UPI',
                platformFee: parseFloat(platformFee || 0),
                farmerAmount: parseFloat(farmerAmount || 0),
                transporterAmount: parseFloat(transporterAmount || 0)
            }
        });

        // If from negotiation, link them
        if (negotiationId) {
            await prisma.negotiatingChat.update({
                where: { id: negotiationId },
                data: {
                    orderId: order.id,
                    status: 'ACCEPTED'
                }
            });
        }

        // Update listing status
        const newQuantity = listing.quantity - qty;
        await prisma.listing.update({
            where: { id: listingId },
            data: {
                status: newQuantity <= 0 ? 'SOLD' : 'AVAILABLE',
                quantity: newQuantity
            }
        });

        // Emit WebSocket event
        if (req.app.get('io')) {
            req.app.get('io').emit('order:created', {
                order
            });
        }

        // Create persistent notification for farmer
        await prisma.notification.create({
            data: {
                userId: listing.farmerId,
                title: 'New Order Received',
                message: `You have a new order for ${qty} kg of ${listing.crop ? listing.crop.name : 'your crop'}.`,
                type: 'success',
                deliveryId: order.id // Using deliveryId field for order ID link if needed, or just standard
            }
        });

        res.json({ message: 'Order created successfully', order });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};

// Get user's orders (role-based)
exports.getOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let orders;

        if (role === 'BUYER') {
            orders = await prisma.order.findMany({
                where: { buyerId: userId },
                include: {
                    listing: {
                        include: {
                            crop: true,
                            farmer: {
                                include: { farmerProfile: true }
                            }
                        }
                    },
                    delivery: true
                },
                orderBy: { createdAt: 'desc' }
            });

            orders = orders.map(order => {
                if (order.delivery) {
                    delete order.delivery.pickupOtp;
                    delete order.delivery.proofPhotos;
                    delete order.delivery.receiverSignature;
                    // Only strip deliveryOtp once delivery is done — buyer needs it to verify arrival
                    if (['DELIVERED', 'COMPLETED'].includes(order.delivery.status)) {
                        delete order.delivery.deliveryOtp;
                    }
                }
                if (order.listing?.farmer?.farmerProfile) {
                    order.farmer = {
                        id: order.listing.farmer.id,
                        name: order.listing.farmer.farmerProfile.fullName,
                        location: `${order.listing.farmer.farmerProfile.village}, ${order.listing.farmer.farmerProfile.district}`
                    };
                }
                return order;
            });

        } else if (role === 'FARMER') {
            orders = await prisma.order.findMany({
                where: { farmerId: userId },
                include: {
                    listing: {
                        include: { crop: true }
                    },
                    buyer: {
                        include: { buyerProfile: true }
                    },
                    delivery: true
                },
                orderBy: { createdAt: 'desc' }
            });

            orders = orders.map(order => {
                if (order.delivery) {
                    delete order.delivery.deliveryOtp;
                }
                if (order.buyer?.buyerProfile) {
                    order.buyer = {
                        id: order.buyer.id,
                        name: order.buyer.buyerProfile.fullName,
                        location: `${order.buyer.buyerProfile.city}, ${order.buyer.buyerProfile.state}`
                    };
                }
                return order;
            });
        } else {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.json({ orders });
    } catch (error) {
        console.error('Get orders error DETAILED:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch orders' });
    }
};

// Get order details
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const order = await prisma.order.findUnique({
            where: { id },
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
                },
                delivery: {
                    include: {
                        transporter: {
                            include: { transporterProfile: true }
                        }
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check authorization
        if (order.buyerId !== userId && order.farmerId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const formattedOrder = { ...order };

        if (formattedOrder.listing?.farmer) {
            const p = formattedOrder.listing.farmer.farmerProfile;
            formattedOrder.listing.farmer = {
                id: formattedOrder.listing.farmer.id,
                name: p?.fullName,
                phone: p?.phone,
                location: p ? `${p.village}, ${p.district}` : undefined
            };
            formattedOrder.farmer = formattedOrder.listing.farmer;
        }

        if (formattedOrder.buyer) {
            const p = formattedOrder.buyer.buyerProfile;
            formattedOrder.buyer = {
                id: formattedOrder.buyer.id,
                name: p?.fullName,
                phone: p?.phone,
                location: p ? `${p.city}, ${p.state}` : undefined
            };
        }

        if (formattedOrder.delivery?.transporter) {
            const p = formattedOrder.delivery.transporter.transporterProfile;
            formattedOrder.delivery.transporter = {
                id: formattedOrder.delivery.transporter.id,
                name: p?.fullName,
                phone: p?.phone
            };
        }

        if (formattedOrder.delivery) {
            if (req.user.role === 'BUYER') {
                delete formattedOrder.delivery.pickupOtp;
                delete formattedOrder.delivery.proofPhotos;
                delete formattedOrder.delivery.receiverSignature;
                // Only strip deliveryOtp once delivery is done — buyer needs it to verify arrival
                if (['DELIVERED', 'COMPLETED'].includes(formattedOrder.delivery.status)) {
                    delete formattedOrder.delivery.deliveryOtp;
                }
            }
            if (req.user.role === 'FARMER') {
                delete formattedOrder.delivery.deliveryOtp;
            }
        }

        res.json({ order: formattedOrder });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
};

// Set delivery responsibility
exports.setDeliveryOption = async (req, res) => {
    try {
        const { id } = req.params;
        const { deliveryResponsibility, deliveryMode } = req.body;
        const userId = req.user.id;

        const order = await prisma.order.findUnique({
            where: { id }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Only buyer can set delivery option
        if (order.buyerId !== userId) {
            return res.status(403).json({ error: 'Only buyer can set delivery option' });
        }

        // Can't change if delivery already created
        const existingDelivery = await prisma.delivery.findUnique({
            where: { orderId: id }
        });

        if (existingDelivery) {
            return res.status(400).json({ error: 'Delivery already arranged' });
        }

        const updateData = { deliveryResponsibility };

        // Handle delivery mode for BUYER_ARRANGED
        if (deliveryResponsibility === 'BUYER_ARRANGED' && deliveryMode) {
            updateData.deliveryMode = deliveryMode;

            if (deliveryMode === 'SELF_PICKUP') {
                // Generate 2 OTPs for 2-step verification
                // 1. farmerPickupOtp: Farmer shows to Buyer (Step 1)
                // 2. buyerPickupOtp: Buyer shows to Farmer (Step 2)
                updateData.farmerPickupOtp = crypto.randomInt(100000, 999999).toString();
                updateData.buyerPickupOtp = crypto.randomInt(100000, 999999).toString();
                updateData.selfPickupStatus = 'PENDING';

                updateData.orderStatus = 'AWAITING_PICKUP';
                updateData.transporterAmount = 0; // No delivery fee for self-pickup
            } else if (deliveryMode === 'ARRANGE_DELIVERY') {
                // Reset if switching
                updateData.farmerPickupOtp = null;
                updateData.buyerPickupOtp = null;
                updateData.selfPickupStatus = null;
            }
        }

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: updateData
        });

        res.json({ message: 'Delivery option updated', order: updatedOrder });
    } catch (error) {
        console.error('Set delivery option error:', error);
        res.status(500).json({ error: 'Failed to update delivery option' });
    }
};

// Get self-pickup details for authorized party
exports.getSelfPickupDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                listing: {
                    include: {
                        crop: true,
                        farmer: { include: { farmerProfile: true } }
                    }
                },
                buyer: { include: { buyerProfile: true } },
                farmer: { include: { farmerProfile: true } },
                delivery: true
            }
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Authorization check
        if (order.buyerId !== userId && order.farmerId !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Check if consistent with Self Pickup (allow NULL for legacy/migrations)
        const isSelfPickup = order.deliveryMode === 'SELF_PICKUP' ||
            (order.deliveryMode === null && !order.delivery);

        if (!isSelfPickup) {
            return res.status(400).json({ message: 'Not a self-pickup order' });
        }

        // Initialize 2-step verification if missing (Legacy Support)
        if (!order.selfPickupStatus || order.deliveryMode === null) {
            const farmerPickupOtp = crypto.randomInt(100000, 999999).toString();
            const buyerPickupOtp = crypto.randomInt(100000, 999999).toString();

            await prisma.order.update({
                where: { id },
                data: {
                    farmerPickupOtp,
                    buyerPickupOtp,
                    selfPickupStatus: 'PENDING',
                    deliveryMode: 'SELF_PICKUP' // Auto-fix mode
                }
            });

            // Update local object for response
            order.farmerPickupOtp = farmerPickupOtp;
            order.buyerPickupOtp = buyerPickupOtp;
            order.selfPickupStatus = 'PENDING';
            order.deliveryMode = 'SELF_PICKUP';
        }

        // Return only relevant details based on role and status
        const response = {
            selfPickupStatus: order.selfPickupStatus,
            orderStatus: order.orderStatus,
            orderId: order.id,
            crop: order.listing?.crop?.name,
            quantity: order.quantity,
            farmer: {
                name: order.farmer?.farmerProfile?.fullName || order.listing?.farmer?.farmerProfile?.fullName || 'Farmer',
                location: order.farmer?.farmerProfile ? `${order.farmer.farmerProfile.village}, ${order.farmer.farmerProfile.district}` :
                    (order.listing?.farmer?.farmerProfile ? `${order.listing.farmer.farmerProfile.village}, ${order.listing.farmer.farmerProfile.district}` : 'Location n/a')
            },
            buyer: order.buyer?.buyerProfile ? {
                name: order.buyer.buyerProfile.fullName,
                location: `${order.buyer.buyerProfile.city || ''}, ${order.buyer.buyerProfile.state || ''}`
            } : null
        };

        if (userId === order.buyerId) {
            // User is BUYER
            response.role = 'BUYER';
            // Buyer needs to SEE buyerPickupOtp (for Step 2)
            if (order.selfPickupStatus === 'BUYER_VERIFIED') {
                response.buyerPickupOtp = order.buyerPickupOtp;
            }
        } else {
            // User is FARMER
            response.role = 'FARMER';
            // Farmer needs to SEE farmerPickupOtp (for Step 1)
            if (order.selfPickupStatus === 'PENDING') {
                response.farmerPickupOtp = order.farmerPickupOtp;
            }
        }

        res.json(response);
    } catch (error) {
        console.error('Get self pickup details error:', error);
        res.status(500).json({
            message: 'Failed to get pickup details',
            error: error.message,
            stack: error.stack
        });
    }
};

// Verify self-pickup step
exports.verifySelfPickupStep = async (req, res) => {
    const { id } = req.params;
    const { otp, step } = req.body; // step: 'VERIFY_FARMER' (1) or 'VERIFY_BUYER' (2)
    const userId = req.user.id;

    try {
        const order = await prisma.order.findUnique({
            where: { id },
            include: { listing: { include: { crop: true } } }
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.deliveryMode !== 'SELF_PICKUP') {
            return res.status(400).json({ message: 'Not a self-pickup order' });
        }

        if (step === 'VERIFY_FARMER') {
            // Step 1: Verify Farmer

            if (userId !== order.buyerId) {
                return res.status(403).json({ message: 'Only buyer can perform this verification step' });
            }

            if (order.selfPickupStatus !== 'PENDING') {
                return res.status(400).json({ message: 'Invalid status for this verification step' });
            }

            if (otp !== order.farmerPickupOtp) {
                return res.status(400).json({ message: 'Invalid OTP' });
            }

            // Success Step 1
            await prisma.order.update({
                where: { id },
                data: { selfPickupStatus: 'BUYER_VERIFIED' }
            });

            // Notify Farmer that Step 1 is done
            const io = req.app.get('io');
            if (io) {
                io.to(`order_${id}`).emit('self_pickup_update', {
                    selfPickupStatus: 'BUYER_VERIFIED',
                    message: 'Buyer successfully verified Farmer. Proceed to Step 2.'
                });
            }

            return res.json({ message: 'Farmer verified successfully. Proceed to Step 2.', status: 'BUYER_VERIFIED' });

        } else if (step === 'VERIFY_BUYER') {
            // Step 2: Verify Buyer

            if (userId !== order.farmerId) {
                return res.status(403).json({ message: 'Only farmer can perform this verification step' });
            }

            if (order.selfPickupStatus !== 'BUYER_VERIFIED') {
                return res.status(400).json({ message: 'Invalid status for this verification step. Step 1 must be completed first.' });
            }

            if (otp !== order.buyerPickupOtp) {
                return res.status(400).json({ message: 'Invalid OTP' });
            }

            // Success Step 2 - Complete Order
            const updatedOrder = await prisma.$transaction(async (prisma) => {
                // 1. Update Order Status
                const o = await prisma.order.update({
                    where: { id },
                    data: {
                        selfPickupStatus: 'COMPLETED',
                        orderStatus: 'COMPLETED',
                        // Clear OTPs
                        buyerPickupOtp: null,
                        farmerPickupOtp: null
                    }
                });

                // 2. Report Sale / Update Listing
                await prisma.listing.update({
                    where: { id: order.listingId },
                    data: { status: 'SOLD' }
                });

                return o;
            });

            // Release Funds
            try {
                // Calculate amounts
                const totalAmount = order.priceFinal;
                const platformFee = Math.round(totalAmount * 0.10); // 10%
                const farmerAmount = totalAmount - platformFee;

                await releaseFundsForOrder(id, farmerAmount);
            } catch (e) {
                console.error('Fund release failed:', e);
            }

            // Notify everyone
            const io = req.app.get('io');
            if (io) {
                io.to(`order_${id}`).emit('order_status_update', {
                    orderId: id,
                    status: 'COMPLETED',
                    deliveryStatus: 'COMPLETED'
                });
                io.to(`order_${id}`).emit('self_pickup_update', {
                    selfPickupStatus: 'COMPLETED',
                    message: 'Pickup completed successfully.'
                });

                // Send notification to buyer
                const cropName = order.listing?.crop?.name || 'crop';
                await prisma.notification.create({
                    data: {
                        userId: order.buyerId,
                        title: 'Self Pickup Completed!',
                        message: `Your pickup for ${cropName} is verified and completed.`,
                        type: 'success'
                    }
                });
            }

            return res.json({ message: 'Pickup completed successfully', status: 'COMPLETED', order: updatedOrder });

        } else {
            return res.status(400).json({ message: 'Invalid verification step' });
        }
    } catch (error) {
        console.error('Verify self pickup error:', error);
        res.status(500).json({ message: 'Verification failed' });
    }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const buyerId = req.user.id;

        const order = await prisma.order.findUnique({
            where: { id },
            include: { listing: true }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.buyerId !== buyerId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (order.orderStatus !== 'ORDER_CREATED') {
            return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
        }

        // Transaction to update order and restore listing quantity
        await prisma.$transaction(async (prisma) => {
            // Update order status
            await prisma.order.update({
                where: { id },
                data: { orderStatus: 'CANCELLED' }
            });

            // Restore listing quantity
            if (order.listingId) {
                await prisma.listing.update({
                    where: { id: order.listingId },
                    data: {
                        quantity: { increment: order.quantity },
                        status: 'AVAILABLE' // Ensure it's available if it was sold out
                    }
                });
            }
        });

        // Emit WebSocket event
        if (req.app.get('io')) {
            req.app.get('io').emit('order:cancelled', {
                orderId: id
            });
        }

        // Create persistent notification for farmer
        const listingId = order.listingId;
        const listing = await prisma.listing.findUnique({ where: { id: listingId } });
        if (listing) {
            await prisma.notification.create({
                data: {
                    userId: listing.farmerId,
                    title: 'Order Cancelled',
                    message: `Order #${id.slice(-6)} has been cancelled by the buyer.`,
                    type: 'error'
                }
            });
        }

        res.json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ error: 'Failed to cancel order' });
    }
};

module.exports = exports;
