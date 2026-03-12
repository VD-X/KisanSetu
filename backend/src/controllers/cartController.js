const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
const distanceService = require('../services/distanceService');
const { debitWallet } = require('../services/walletService');

// Add item to cart
exports.addToCart = async (req, res) => {
    try {
        const { listingId, quantity, negotiationId } = req.body;
        const buyerId = req.user.id;

        if (!listingId || !quantity) {
            return res.status(400).json({ error: 'Missing listingId or quantity' });
        }

        if (!/^[0-9a-fA-F]{24}$/.test(listingId)) {
            return res.status(404).json({ error: 'Listing not found (invalid ID format)' });
        }

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        // Check if listing exists and has enough quantity
        const listing = await prisma.listing.findUnique({
            where: { id: listingId }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        if (listing.status !== 'AVAILABLE') {
            return res.status(400).json({ error: 'Listing is no longer available' });
        }

        if (listing.quantity < qty) {
            return res.status(400).json({ error: `Insufficient quantity. Only ${listing.quantity}kg available.` });
        }

        // Get or create cart (needed for farmer check too)
        let cart = await prisma.cart.findUnique({
            where: { buyerId },
            include: {
                items: {
                    include: { listing: true }
                }
            }
        });

        // Enforce same-farmer rule
        if (cart && cart.items.length > 0) {
            const existingFarmerId = cart.items[0].listing.farmerId;
            if (listing.farmerId !== existingFarmerId) {
                return res.status(400).json({
                    error: 'Cart already contains items from another farmer. Please complete that order first or clear your cart.',
                    code: 'DIFFERENT_FARMER'
                });
            }
        }

        if (!cart) {
            cart = await prisma.cart.create({
                data: { buyerId },
                include: { items: { include: { listing: true } } }
            });
        }

        // Check if item already in cart
        const existingItem = cart.items.find(item => item.listingId === listingId);

        if (existingItem) {
            if (qty > listing.quantity) {
                return res.status(400).json({ error: `Insufficient quantity. Only ${listing.quantity}kg available.` });
            }

            // Set quantity (treat request quantity as desired quantity)
            const updatedItem = await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: {
                    quantity: qty,
                    negotiationId: negotiationId || null,
                    lockedAt: new Date()
                }
            });

            return res.json({ message: 'Cart updated', item: updatedItem });
        }

        // Create new cart item
        const cartItem = await prisma.cartItem.create({
            data: {
                cartId: cart.id,
                listingId,
                quantity: qty,
                negotiationId: negotiationId || null,
                lockedAt: new Date()
            }
        });

        res.json({ message: 'Item added to cart', item: cartItem });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: error.message || 'Failed to add item to cart' });
    }
};

// Get buyer's cart
exports.getCart = async (req, res) => {
    try {
        const buyerId = req.user.id;

        const cart = await prisma.cart.findUnique({
            where: { buyerId },
            include: {
                items: {
                    include: {
                        listing: {
                            include: {
                                crop: true,
                                farmer: {
                                    include: { farmerProfile: true }
                                }
                            }
                        },
                        negotiation: true
                    }
                }
            }
        });

        if (cart) {
            cart.items = cart.items.map(item => {
                const farmer = item.listing.farmer;
                if (farmer && farmer.farmerProfile) {
                    item.listing.farmer = {
                        id: farmer.id,
                        name: farmer.farmerProfile.fullName,
                        location: `${farmer.farmerProfile.village}, ${farmer.farmerProfile.district}`
                    };
                }
                return item;
            });
        }

        res.json({ cart: cart || { items: [] } });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;
        const buyerId = req.user.id;

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        const cartItem = await prisma.cartItem.findUnique({
            where: { id: itemId },
            include: { cart: true, listing: true }
        });

        if (!cartItem || cartItem.cart.buyerId !== buyerId) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        if (cartItem.listing.status !== 'AVAILABLE') {
            return res.status(400).json({ error: 'Listing is no longer available' });
        }

        if (cartItem.listing.quantity < qty) {
            return res.status(400).json({ error: `Insufficient quantity. Only ${cartItem.listing.quantity}kg available.` });
        }

        // Update cart item
        const updatedItem = await prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity: qty }
        });

        res.json({ message: 'Cart item updated', item: updatedItem });
    } catch (error) {
        console.error('Update cart item error:', error);
        res.status(500).json({ error: error.message || 'Failed to update cart item' });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    try {
        const { itemId } = req.params;
        const buyerId = req.user.id;

        const cartItem = await prisma.cartItem.findUnique({
            where: { id: itemId },
            include: { cart: true, listing: true }
        });

        if (!cartItem || cartItem.cart.buyerId !== buyerId) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        // Delete cart item
        await prisma.cartItem.delete({
            where: { id: itemId }
        });

        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
};

// Checkout - Convert cart to orders
exports.checkout = async (req, res) => {
    try {
        const {
            deliveryResponsibility,
            deliveryMode,
            deliveryLatitude,
            deliveryLongitude,
            deliveryAddress,
            distanceKm,
            estimatedDuration,
            paymentMethod,
            platformFee,
            farmerAmount,
            transporterAmount
        } = req.body;
        const buyerId = req.user.id;

        if (!deliveryAddress || typeof deliveryAddress !== 'string' || deliveryAddress.trim().length === 0) {
            return res.status(400).json({ error: 'Delivery address is required' });
        }

        if (!distanceService.isValidCoordinate(deliveryLatitude, deliveryLongitude)) {
            return res.status(400).json({ error: 'Valid delivery coordinates are required' });
        }

        const cart = await prisma.cart.findUnique({
            where: { buyerId },
            include: {
                buyer: { include: { buyerProfile: true } },
                items: {
                    include: {
                        listing: {
                            include: {
                                farmer: { include: { farmerProfile: true } },
                                crop: true
                            }
                        },
                        negotiation: true
                    }
                }
            }
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const orders = [];
        const io = req.app.get('io');

        // Calculate total amount to debit from wallet
        let totalCropAmount = 0;
        const itemPricing = [];

        for (const item of cart.items) {
            let finalUnitPrice = parseFloat(item.listing.expectedPrice || 0);
            if (item.negotiation && item.negotiation.status === 'ACCEPTED') {
                const acceptedAt = new Date(item.negotiation.updatedAt).getTime();
                const now = new Date().getTime();
                const diffHours = (now - acceptedAt) / (1000 * 60 * 60);
                if (diffHours <= 2) {
                    finalUnitPrice = parseFloat(item.negotiation.currentOffer || 0);
                }
            }
            const itemTotal = finalUnitPrice * parseFloat(item.quantity || 0);
            totalCropAmount += itemTotal;
            itemPricing.push({ itemId: item.id, finalUnitPrice, itemTotal });
        }

        // Add platform fee and transporter fee if applicable
        const safePlatformFee = parseFloat(platformFee || 0);
        const safeTransporterAmount = parseFloat(transporterAmount || 0);
        const totalDebitAmount = Number((totalCropAmount + safePlatformFee + safeTransporterAmount).toFixed(2));

        console.log(`[Checkout] Calculating total deduction for buyer ${buyerId}:
            - Crops: ₹${totalCropAmount}
            - Platform Fee: ₹${safePlatformFee}
            - Transporter Fee: ₹${safeTransporterAmount}
            - Total to Debit: ₹${totalDebitAmount}`);

        if (isNaN(totalDebitAmount) || totalDebitAmount <= 0) {
            console.warn(`[Checkout] Zero or invalid total deduction amount: ${totalDebitAmount}. Proceeding without wallet debit.`);
        }

        // Perform checkout in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Verify and Debit Wallet (only if amount > 0)
            const wallet = await tx.wallet.findUnique({ where: { userId: buyerId } });

            console.log(`[Checkout] Wallet found for user ${buyerId}: ${!!wallet}, ID: ${wallet?.id}, Balance: ₹${wallet?.balance || 0}`);

            if (totalDebitAmount > 0) {
                if (!wallet || (parseFloat(wallet.balance) < totalDebitAmount)) {
                    console.error(`[Checkout] Insufficient balance for user ${buyerId}. Required: ₹${totalDebitAmount}, Available: ₹${wallet?.balance || 0}`);
                    throw new Error(`Insufficient wallet balance. Total required: ₹${totalDebitAmount.toFixed(2)}. Available: ₹${(parseFloat(wallet?.balance || 0)).toFixed(2)}`);
                }

                const updatedWallet = await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { decrement: totalDebitAmount } }
                });

                console.log(`[Checkout] Wallet ${wallet.id} updated. New Balance: ₹${updatedWallet.balance}`);
            }

            // 2. Create Orders
            const createdOrders = [];
            for (let i = 0; i < cart.items.length; i++) {
                const item = cart.items[i];
                const pricing = itemPricing[i];
                const listing = item.listing;

                const isSelfPickup = deliveryResponsibility === 'BUYER_ARRANGED' && deliveryMode === 'SELF_PICKUP';
                const selfPickupOtp = isSelfPickup ? crypto.randomInt(100000, 999999).toString() : null;

                // For multi-item carts, we might need to split platformFee and transporterAmount.
                // Simple logic: attach fees to the first order, or keep it as passed.
                // However, frontend sends total fees for the whole cart.
                // For now, we'll attribute fees to the first order to keep logic simple and total correct.
                const currentPlatformFee = i === 0 ? safePlatformFee : 0;
                const currentTransporterAmount = i === 0 ? safeTransporterAmount : 0;

                const order = await tx.order.create({
                    data: {
                        listingId: item.listingId,
                        buyerId,
                        farmerId: item.listing.farmerId,
                        quantity: item.quantity,
                        priceFinal: pricing.itemTotal,
                        deliveryResponsibility: deliveryResponsibility || 'FARMER_ARRANGED',
                        deliveryMode: deliveryResponsibility === 'BUYER_ARRANGED' ? (deliveryMode || null) : null,
                        buyerPickupOtp: selfPickupOtp,
                        orderStatus: isSelfPickup ? 'AWAITING_PICKUP' : 'ORDER_CREATED',
                        deliveryLatitude,
                        deliveryLongitude,
                        deliveryAddress: deliveryAddress.trim(),
                        distanceKm: distanceKm, // Simpler for now
                        estimatedDuration: estimatedDuration,
                        paymentStatus: 'HELD',
                        paymentMethod: paymentMethod || 'UPI',
                        platformFee: currentPlatformFee,
                        farmerAmount: pricing.itemTotal,
                        transporterAmount: isSelfPickup ? 0 : currentTransporterAmount
                    }
                });

                // Create Transaction records for detailed history
                // Crop Payment
                await tx.transaction.create({
                    data: {
                        walletId: wallet.id,
                        amount: pricing.itemTotal,
                        type: 'DEBIT',
                        description: `Crop Purchase: ${listing.crop?.name} (${item.quantity}kg)`,
                        orderId: order.id,
                        status: 'SUCCESS'
                    }
                });

                // Delivery Fee (if any on this order)
                if (currentTransporterAmount > 0) {
                    await tx.transaction.create({
                        data: {
                            walletId: wallet.id,
                            amount: currentTransporterAmount,
                            type: 'DEBIT',
                            description: `Delivery Fee for Order #${order.id.slice(-6)}`,
                            orderId: order.id,
                            status: 'SUCCESS'
                        }
                    });
                }

                // Platform Fee (if any on this order)
                if (currentPlatformFee > 0) {
                    await tx.transaction.create({
                        data: {
                            walletId: wallet.id,
                            amount: currentPlatformFee,
                            type: 'DEBIT',
                            description: `Platform Fee for Order #${order.id.slice(-6)}`,
                            orderId: order.id,
                            status: 'SUCCESS'
                        }
                    });
                }

                if (item.negotiationId) {
                    await tx.negotiatingChat.update({
                        where: { id: item.negotiationId },
                        data: { orderId: order.id }
                    });
                }

                // Update Listing
                await tx.listing.update({
                    where: { id: item.listingId },
                    data: {
                        quantity: { decrement: item.quantity },
                        status: {
                            set: (listing.quantity - item.quantity) <= 0 ? 'SOLD' : 'AVAILABLE'
                        }
                    }
                });

                createdOrders.push(order);
            }

            return createdOrders;
        });

        // 3. Post-transaction actions (Notifications)
        for (const order of result) {
            const item = cart.items.find(it => it.listingId === order.listingId);
            if (io && item) {
                const buyerName = cart.buyer?.buyerProfile?.fullName || 'a Buyer';
                const cropName = item.listing.crop?.name || 'Crop';

                io.emit('order:created', { order });
                io.to(`user-${item.listing.farmerId}`).emit('notification', {
                    title: 'New Order Received! 🎉',
                    message: `You have a new order for ${item.quantity}kg of ${cropName} from ${buyerName}.`,
                    type: 'new_listing',
                    timestamp: new Date(),
                    deliveryId: order.id
                });
            }
        }

        // Clear Cart
        await prisma.cartItem.deleteMany({
            where: { cartId: cart.id }
        });

        res.json({ message: 'Checkout successful', orders: result });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: error.message || 'Checkout failed' });
    }
};

module.exports = exports;
