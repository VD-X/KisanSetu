const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    try {
        console.log("Starting data cleanup...");

        // Delete dependencies first
        const auditLogCount = await prisma.earningAuditLog.deleteMany({});
        console.log(`- Deleted ${auditLogCount.count} earning audit logs.`);

        const earningCount = await prisma.earning.deleteMany({});
        console.log(`- Deleted ${earningCount.count} earnings.`);

        const deliveryCount = await prisma.delivery.deleteMany({});
        console.log(`- Deleted ${deliveryCount.count} deliveries.`);

        const orderCount = await prisma.order.deleteMany({});
        console.log(`- Deleted ${orderCount.count} orders.`);

        const transactionCount = await prisma.transaction.deleteMany({});
        console.log(`- Deleted ${transactionCount.count} transactions.`);

        const negMsgCount = await prisma.negotiationMessage.deleteMany({});
        console.log(`- Deleted ${negMsgCount.count} negotiation messages.`);

        const negChatCount = await prisma.negotiatingChat.deleteMany({});
        console.log(`- Deleted ${negChatCount.count} negotiation chats.`);

        const cartItemCount = await prisma.cartItem.deleteMany({});
        console.log(`- Deleted ${cartItemCount.count} cart items.`);

        const reviewCount = await prisma.review.deleteMany({});
        console.log(`- Deleted ${reviewCount.count} reviews.`);

        // Reset listings to AVAILABLE
        const updatedListings = await prisma.listing.updateMany({
            where: {
                status: {
                    in: ['LOCKED', 'SOLD', 'IN_DELIVERY', 'PAUSED']
                }
            },
            data: {
                status: 'AVAILABLE'
            }
        });
        console.log(`- Reset ${updatedListings.count} listings to AVAILABLE.`);

        console.log("Cleanup completed successfully.");
    } catch (error) {
        console.error("Cleanup failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
