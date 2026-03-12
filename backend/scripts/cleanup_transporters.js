const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupTestTransporters() {
    console.log('🧹 Starting transporter cleanup...\n');

    try {
        // Get all transporters
        const transporters = await prisma.user.findMany({
            where: {
                role: 'TRANSPORTER'
            },
            select: { id: true, email: true }
        });

        console.log(`Found ${transporters.length} transporters to delete\n`);

        if (transporters.length === 0) {
            console.log('✅ No transporters found. Database is already clean!');
            return;
        }

        const transporterIds = transporters.map(t => t.id);

        // Delete in correct order to avoid foreign key constraints
        console.log('Deleting associated data...');

        // 1. Delete earnings
        const deletedEarnings = await prisma.earning.deleteMany({
            where: {
                transporterId: { in: transporterIds }
            }
        });
        console.log(`  ✓ Deleted ${deletedEarnings.count} earnings records`);

        // 2. Delete deliveries
        const deletedDeliveries = await prisma.delivery.deleteMany({
            where: {
                transporterId: { in: transporterIds }
            }
        });
        console.log(`  ✓ Deleted ${deletedDeliveries.count} deliveries`);

        // 3. Delete transporter profiles
        const deletedProfiles = await prisma.transporterProfile.deleteMany({
            where: {
                userId: { in: transporterIds }
            }
        });
        console.log(`  ✓ Deleted ${deletedProfiles.count} transporter profiles`);

        // 4. Finally, delete transporter users
        const deletedUsers = await prisma.user.deleteMany({
            where: {
                id: { in: transporterIds }
            }
        });
        console.log(`  ✓ Deleted ${deletedUsers.count} transporter users\n`);

        console.log('✅ Transporter cleanup completed successfully!');
        console.log('\nDeleted transporters:');
        transporters.forEach(t => {
            console.log(`  - ${t.email}`);
        });

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the cleanup
cleanupTestTransporters()
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
