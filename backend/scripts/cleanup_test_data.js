const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupTestData() {
    console.log('🧹 Starting database cleanup...\n');

    try {
        // Get all users except ADMIN role
        const usersToDelete = await prisma.user.findMany({
            where: {
                role: {
                    in: ['FARMER', 'BUYER']
                }
            },
            select: { id: true, email: true, role: true }
        });

        console.log(`Found ${usersToDelete.length} farmers and buyers to delete\n`);

        if (usersToDelete.length === 0) {
            console.log('✅ No test data found. Database is already clean!');
            return;
        }

        const userIds = usersToDelete.map(u => u.id);

        // Delete in correct order to avoid foreign key constraints
        console.log('Deleting associated data...');

        // 1. Delete messages (references chats)
        const deletedMessages = await prisma.message.deleteMany({
            where: {
                senderId: { in: userIds }
            }
        });
        console.log(`  ✓ Deleted ${deletedMessages.count} messages`);

        // 2. Delete negotiating chats
        const deletedChats = await prisma.negotiatingChat.deleteMany({
            where: {
                OR: [
                    { buyerId: { in: userIds } },
                    { farmerId: { in: userIds } }
                ]
            }
        });
        console.log(`  ✓ Deleted ${deletedChats.count} negotiating chats`);

        // 3. Delete cart items
        const deletedCartItems = await prisma.cartItem.deleteMany({
            where: {
                cart: {
                    buyerId: { in: userIds }
                }
            }
        });
        console.log(`  ✓ Deleted ${deletedCartItems.count} cart items`);

        // 4. Delete carts
        const deletedCarts = await prisma.cart.deleteMany({
            where: {
                buyerId: { in: userIds }
            }
        });
        console.log(`  ✓ Deleted ${deletedCarts.count} carts`);

        // 5. Delete earnings
        const deletedEarnings = await prisma.earning.deleteMany({
            where: {
                transporter: {
                    id: { in: userIds }
                }
            }
        });
        console.log(`  ✓ Deleted ${deletedEarnings.count} earnings records`);

        // 6. Delete deliveries
        const deletedDeliveries = await prisma.delivery.deleteMany({
            where: {
                order: {
                    OR: [
                        { buyerId: { in: userIds } },
                        { farmerId: { in: userIds } }
                    ]
                }
            }
        });
        console.log(`  ✓ Deleted ${deletedDeliveries.count} deliveries`);

        // 7. Delete orders
        const deletedOrders = await prisma.order.deleteMany({
            where: {
                OR: [
                    { buyerId: { in: userIds } },
                    { farmerId: { in: userIds } }
                ]
            }
        });
        console.log(`  ✓ Deleted ${deletedOrders.count} orders`);

        // 8. Delete listings
        const deletedListings = await prisma.listing.deleteMany({
            where: {
                farmerId: { in: userIds }
            }
        });
        console.log(`  ✓ Deleted ${deletedListings.count} listings`);

        // 9. Delete image verifications
        const deletedImageVerifications = await prisma.imageVerification.deleteMany({
            where: {
                farmerId: { in: userIds }
            }
        });
        console.log(`  ✓ Deleted ${deletedImageVerifications.count} image verifications`);

        // 10. Delete profiles
        const deletedFarmerProfiles = await prisma.farmerProfile.deleteMany({
            where: {
                userId: { in: userIds }
            }
        });
        console.log(`  ✓ Deleted ${deletedFarmerProfiles.count} farmer profiles`);

        const deletedBuyerProfiles = await prisma.buyerProfile.deleteMany({
            where: {
                userId: { in: userIds }
            }
        });
        console.log(`  ✓ Deleted ${deletedBuyerProfiles.count} buyer profiles`);

        // 11. Finally, delete users
        const deletedUsers = await prisma.user.deleteMany({
            where: {
                id: { in: userIds }
            }
        });
        console.log(`  ✓ Deleted ${deletedUsers.count} users\n`);

        console.log('✅ Database cleanup completed successfully!');
        console.log('\nDeleted users:');
        usersToDelete.forEach(u => {
            console.log(`  - ${u.email} (${u.role})`);
        });

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the cleanup
cleanupTestData()
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
