const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getWallet } = require('../services/walletService');

// Get current user's wallet and transactions
exports.getMyWallet = async (req, res) => {
    try {
        const userId = req.user.id;
        const wallet = await getWallet(userId);
        res.json({ wallet });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({ error: 'Failed to fetch wallet information' });
    }
};

// Mock payment: Add funds to wallet (for demo purposes)
exports.addFunds = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const wallet = await prisma.$transaction(async (tx) => {
            let w = await tx.wallet.findUnique({ where: { userId } });
            if (!w) {
                w = await tx.wallet.create({ data: { userId, balance: 0 } });
            }

            const updatedWallet = await tx.wallet.update({
                where: { id: w.id },
                data: { balance: { increment: parseFloat(amount) } }
            });

            await tx.transaction.create({
                data: {
                    walletId: w.id,
                    amount: parseFloat(amount),
                    type: 'CREDIT',
                    description: 'Funds added via Dashboard (Demo)',
                    status: 'SUCCESS'
                }
            });

            return updatedWallet;
        });

        res.json({ message: 'Funds added successfully', balance: wallet.balance });
    } catch (error) {
        console.error('Add funds error:', error);
        res.status(500).json({ error: 'Failed to add funds' });
    }
};

module.exports = exports;
