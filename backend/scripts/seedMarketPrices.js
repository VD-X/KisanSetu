const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const marketPriceService = require('../src/services/marketPriceService');

async function seedMarketPrices() {
    try {
        console.log('🌾 Starting market price seeding...\n');

        // Get all active crops
        const crops = await prisma.crop.findMany({
            where: { isActive: true },
            select: { id: true, name: true, icon: true }
        });

        if (crops.length === 0) {
            console.log('⚠️  No crops found in database. Please seed crops first.');
            return;
        }

        console.log(`Found ${crops.length} crops to seed prices for:\n`);

        // Delete old prices (optional - comment out if you want to keep history)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const deleted = await prisma.marketPrice.deleteMany({
            where: {
                date: { lt: today }
            }
        });

        if (deleted.count > 0) {
            console.log(`🗑️  Deleted ${deleted.count} old price records\n`);
        }

        // Seed prices for each crop
        let successCount = 0;
        let failCount = 0;

        for (const crop of crops) {
            try {
                console.log(`📊 Fetching price for ${crop.icon} ${crop.name}...`);

                // This will try API → AI → Mock data
                const priceData = await marketPriceService.getPriceForCrop(crop.id, 'Andhra Pradesh');

                if (priceData) {
                    console.log(`   ✅ Success: ₹${priceData.min}-${priceData.max} (avg: ₹${priceData.avg})`);
                    console.log(`   📍 Mandi: ${priceData.mandi}`);
                    if (priceData.msp) {
                        console.log(`   💰 MSP: ₹${priceData.msp}/kg`);
                    }
                    successCount++;
                } else {
                    console.log(`   ❌ Failed to fetch price`);
                    failCount++;
                }
            } catch (error) {
                console.error(`   ❌ Error: ${error.message}`);
                failCount++;
            }

            console.log(''); // Empty line for readability
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✅ Successfully seeded ${successCount} crop prices`);
        if (failCount > 0) {
            console.log(`❌ Failed to seed ${failCount} crop prices`);
        }
        console.log('='.repeat(50) + '\n');

        // Verify the seeded data
        const totalPrices = await prisma.marketPrice.count({
            where: {
                date: { gte: today }
            }
        });

        console.log(`📈 Total market prices in database (today): ${totalPrices}`);

        // Show sample prices
        const samplePrices = await prisma.marketPrice.findMany({
            where: { date: { gte: today } },
            include: { crop: { select: { name: true, icon: true } } },
            take: 5
        });

        if (samplePrices.length > 0) {
            console.log('\n📋 Sample prices:');
            samplePrices.forEach(p => {
                console.log(`   ${p.crop.icon} ${p.crop.name}: ₹${p.min}-${p.max} (avg: ₹${p.avg}) @ ${p.mandi}`);
            });
        }

        console.log('\n✨ Market price seeding completed!\n');

    } catch (error) {
        console.error('❌ Error seeding market prices:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seed function
seedMarketPrices()
    .then(() => {
        console.log('👍 Seed script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Seed script failed:', error);
        process.exit(1);
    });
