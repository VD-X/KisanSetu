const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Starting cleanup of listings and dependencies...');

        // 1. Delete Earnings (depends on Delivery)
        const deletedEarnings = await prisma.earning.deleteMany({});
        console.log(`Deleted ${deletedEarnings.count} earnings.`);

        // 2. Delete Deliveries (depends on Order)
        const deletedDeliveries = await prisma.delivery.deleteMany({});
        console.log(`Deleted ${deletedDeliveries.count} deliveries.`);

        // 3. Delete Messages (depends on NegotiatingChat)
        const deletedMessages = await prisma.message.deleteMany({});
        console.log(`Deleted ${deletedMessages.count} messages.`);

        // 4. Delete NegotiatingChats (depends on Listing/Order)
        const deletedChats = await prisma.negotiatingChat.deleteMany({});
        console.log(`Deleted ${deletedChats.count} chats.`);

        // 5. Delete CartItems (depends on Listing/Order)
        const deletedCartItems = await prisma.cartItem.deleteMany({});
        console.log(`Deleted ${deletedCartItems.count} cart items.`);

        // 6. Delete Orders (depends on Listing)
        const deletedOrders = await prisma.order.deleteMany({});
        console.log(`Deleted ${deletedOrders.count} orders.`);

        // 7. Finally, delete Listings
        const deletedListings = await prisma.listing.deleteMany({});
        console.log(`Deleted ${deletedListings.count} listings.`);

    } catch (error) {
        console.error('Error cleaning up listings:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
