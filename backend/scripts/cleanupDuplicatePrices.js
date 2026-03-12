const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicates() {
    try {
        console.log('🧹 Starting cleanup of duplicate market prices...\n');

        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all market prices for today grouped by crop
        const allPrices = await prisma.marketPrice.findMany({
            where: {
                date: { gte: today }
            },
            include: {
                crop: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        console.log(`Found ${allPrices.length} total price records for today\n`);

        // Group by cropId and keep only the latest one
        const seenCrops = new Set();
        const toDelete = [];

        for (const price of allPrices) {
            if (seenCrops.has(price.cropId)) {
                toDelete.push(price.id);
                console.log(`❌ Marking duplicate for deletion: ${price.crop.icon} ${price.crop.name}`);
            } else {
                seenCrops.add(price.cropId);
                console.log(`✅ Keeping: ${price.crop.icon} ${price.crop.name} - ₹${price.avg}`);
            }
        }

        if (toDelete.length > 0) {
            console.log(`\n🗑️  Deleting ${toDelete.length} duplicate records...`);
            await prisma.marketPrice.deleteMany({
                where: {
                    id: { in: toDelete }
                }
            });
            console.log('✅ Duplicates removed!');
        } else {
            console.log('\n✨ No duplicates found!');
        }

        // Show final count
        const finalCount = await prisma.marketPrice.count({
            where: {
                date: { gte: today }
            }
        });

        console.log(`\n📊 Final count: ${finalCount} unique crop prices for today`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

cleanupDuplicates()
    .then(() => {
        console.log('\n👍 Cleanup completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Cleanup failed:', error);
        process.exit(1);
    });
