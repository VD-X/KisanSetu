const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearMarketPrices() {
    try {
        console.log('🧹 Clearing all market prices...\n');

        const result = await prisma.marketPrice.deleteMany({});

        console.log(`✅ Deleted ${result.count} market price records\n`);
        console.log('💡 New prices will be generated automatically when farmers access the Market Prices page.');
        console.log('   Each farmer will see prices from their local mandi based on their profile location.\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearMarketPrices();
