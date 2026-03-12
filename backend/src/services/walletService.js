const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const creditWallet = async (userId, amount, description, orderId, io) => {
    if (!amount || amount <= 0) return null;

    return await prisma.$transaction(async (tx) => {
        let wallet = await tx.wallet.findUnique({
            where: { userId }
        });

        if (!wallet) {
            wallet = await tx.wallet.create({
                data: {
                    userId,
                    balance: 0
                }
            });
        }

        const updatedWallet = await tx.wallet.update({
            where: { id: wallet.id },
            data: {
                balance: { increment: amount }
            }
        });

        const transaction = await tx.transaction.create({
            data: {
                walletId: wallet.id,
                amount,
                type: 'CREDIT',
                description,
                orderId,
                status: 'SUCCESS'
            }
        });

        // Emit notification
        if (io) {
            io.to(`user-${userId}`).emit('notification', {
                title: 'Payment Received',
                message: `₹${amount} credited: ${description}`,
                type: 'success',
                timestamp: new Date()
            });
        }

        return { wallet: updatedWallet, transaction };
    });
};

const releaseFundsForOrder = async (orderId, io) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) throw new Error('Order not found');

        // Only release if funds are currently HELD
        if (order.paymentStatus !== 'HELD') {
            return { message: 'Funds already released or not applicable', status: order.paymentStatus };
        }

        // 1. Credit Farmer
        if (order.farmerAmount > 0) {
            await creditWallet(
                order.farmerId,
                order.farmerAmount,
                `Payment for Order #${order.id.slice(-6)}`,
                order.id,
                io
            );
        }

        // 2. Transporter credit is handled via earningsService usually, 
        // but if we want to ensure it matches the order allocation:
        // (Skipping here to avoid double credit if earningsService handles it)
        // However, we should ensure order.transporterAmount is accurate or reconciled.
        // For now, we assume earningsService handles the specific Transporter logic 
        // linked to the Delivery Deal, as that accounts for surge/time.

        // 3. Update Order Status
        await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: 'RELEASED' }
        });

        return { success: true };
    } catch (error) {
        console.error('Release funds error:', error);
        throw error;
    }
};

const getWallet = async (userId) => {
    let wallet = await prisma.wallet.findUnique({
        where: { userId },
        include: {
            transactions: {
                orderBy: { createdAt: 'desc' },
                take: 20
            }
        }
    });

    if (!wallet) {
        wallet = await prisma.wallet.create({
            data: {
                userId,
                balance: 0
            },
            include: {
                transactions: true
            }
        });
    }

    return wallet;
};

const debitWallet = async (userId, amount, description, orderId, io) => {
    if (!amount || amount <= 0) return null;

    return await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({
            where: { userId }
        });

        if (!wallet || wallet.balance < amount) {
            throw new Error('Insufficient wallet balance');
        }

        const updatedWallet = await tx.wallet.update({
            where: { id: wallet.id },
            data: {
                balance: { decrement: amount }
            }
        });

        const transaction = await tx.transaction.create({
            data: {
                walletId: wallet.id,
                amount,
                type: 'DEBIT',
                description,
                orderId,
                status: 'SUCCESS'
            }
        });

        // Emit notification
        if (io) {
            io.to(`user-${userId}`).emit('notification', {
                title: 'Payment Confirmed',
                message: `₹${amount} debited: ${description}`,
                type: 'info',
                timestamp: new Date()
            });
        }

        return { wallet: updatedWallet, transaction };
    });
};

module.exports = {
    creditWallet,
    debitWallet,
    releaseFundsForOrder,
    getWallet
};
