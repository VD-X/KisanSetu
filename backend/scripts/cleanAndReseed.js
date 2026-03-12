const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAndReseed() {
    try {
        console.log('🧹 Starting complete database cleanup and reseed...\n');

        // Step 1: Delete all market prices
        console.log('Step 1: Deleting all market prices...');
        const deletedPrices = await prisma.marketPrice.deleteMany({});
        console.log(`✅ Deleted ${deletedPrices.count} market price records\n`);

        // Step 2: Delete all listings (they reference crops)
        console.log('Step 2: Deleting all listings...');
        const deletedListings = await prisma.listing.deleteMany({});
        console.log(`✅ Deleted ${deletedListings.count} listing records\n`);

        // Step 3: Delete all crops
        console.log('Step 3: Deleting all crops...');
        const deletedCrops = await prisma.crop.deleteMany({});
        console.log(`✅ Deleted ${deletedCrops.count} crop records\n`);

        // Step 4: Create unique crops
        console.log('Step 4: Creating unique crops...');
        const crops = [
            { name: 'Tomato', category: 'Vegetable', icon: '🍅', isActive: true },
            { name: 'Wheat', category: 'Grain', icon: '🌾', isActive: true },
            { name: 'Onion', category: 'Vegetable', icon: '🧅', isActive: true },
            { name: 'Rice', category: 'Grain', icon: '🍚', isActive: true },
            { name: 'Potato', category: 'Vegetable', icon: '🥔', isActive: true },
            { name: 'Cotton', category: 'Cash Crop', icon: '🌱', isActive: true },
            { name: 'Sugarcane', category: 'Cash Crop', icon: '🎋', isActive: true },
            { name: 'Maize', category: 'Grain', icon: '🌽', isActive: true },
            { name: 'Chilli', category: 'Spice', icon: '🌶️', isActive: true },
            { name: 'Turmeric', category: 'Spice', icon: '🟡', isActive: true },
            { name: 'Groundnut', category: 'Oilseed', icon: '🥜', isActive: true },
            { name: 'Soybean', category: 'Pulse', icon: '🫘', isActive: true },
            { name: 'Chickpea', category: 'Pulse', icon: '🫛', isActive: true },
            { name: 'Mustard', category: 'Oilseed', icon: '🟨', isActive: true },
            { name: 'Sunflower', category: 'Oilseed', icon: '🌻', isActive: true },
        ];

        let createdCount = 0;
        for (const cropData of crops) {
            await prisma.crop.create({ data: cropData });
            console.log(`  ✅ Created: ${cropData.icon} ${cropData.name}`);
            createdCount++;
        }

        console.log(`\n✅ Created ${createdCount} unique crops\n`);

        // Step 5: Verify
        const finalCrops = await prisma.crop.findMany({
            orderBy: { name: 'asc' }
        });

        console.log('📊 Final verification:');
        console.log(`Total crops: ${finalCrops.length}`);
        console.log('\nAll crops:');
        finalCrops.forEach(c => {
            console.log(`  ${c.icon} ${c.name} (${c.category})`);
        });

        console.log('\n✨ Cleanup and reseed completed successfully!');
        console.log('\n⚠️  NEXT STEP: Run the market prices seed script:');
        console.log('   node backend/scripts/seedMarketPrices.js\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

cleanAndReseed();
