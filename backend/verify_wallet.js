const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        console.log('--- Comprehensive Wallet Audit ---');

        const wallets = await prisma.wallet.findMany({
            include: {
                user: { select: { email: true, role: true } },
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });

        if (wallets.length === 0) {
            console.log('No wallets found.');
            return;
        }

        wallets.forEach(wallet => {
            console.log(`\nUser: ${wallet.user.email} (${wallet.user.role})`);
            console.log(`Wallet ID: ${wallet.id}`);
            console.log(`Balance: ₹${wallet.balance}`);
            console.log(`Transactions (${wallet.transactions.length}):`);
            wallet.transactions.forEach(tx => {
                console.log(`  - [${tx.type}] ₹${tx.amount} | ${tx.description} | ${tx.createdAt}`);
            });
        });

        console.log('\n--- Recent Orders & Payment Status ---');
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                buyerId: true,
                priceFinal: true,
                paymentStatus: true,
                createdAt: true
            }
        });
        orders.forEach(o => {
            console.log(`Order ${o.id}: ₹${o.priceFinal} | Status: ${o.paymentStatus} | Created: ${o.createdAt}`);
        });

    } catch (error) {
        console.error('Audit Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

check();
