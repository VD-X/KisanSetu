const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const marketPriceService = require('../src/services/marketPriceService');

async function testService() {
    try {
        console.log('🧪 Testing marketPriceService directly...\n');

        // Clear cache first
        marketPriceService.clearCache();
        console.log('✅ Cache cleared\n');

        // Get today's prices
        console.log('📊 Fetching today\'s prices...\n');
        const prices = await marketPriceService.getTodaysPrices('Andhra Pradesh');

        console.log(`Found ${prices.length} prices:\n`);

        prices.slice(0, 5).forEach((price, idx) => {
            console.log(`${idx + 1}. ${price.crop}:`);
            console.log(`   Icon: ${price.icon || '❌ MISSING'}`);
            console.log(`   CropId: ${price.cropId?.substring(0, 8)}...`);
            console.log(`   Price: ₹${price.min}-${price.max} (avg: ₹${price.avg})`);
            console.log('');
        });

        // Check if all have icons
        const missingIcons = prices.filter(p => !p.icon);
        if (missingIcons.length > 0) {
            console.log(`⚠️  ${missingIcons.length} prices missing icons:`);
            missingIcons.forEach(p => console.log(`   - ${p.crop}`));
        } else {
            console.log('✅ All prices have icons!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testService();
