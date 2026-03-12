const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
    try {
        console.log('🔍 Checking database state...\n');

        // Check crops
        const crops = await prisma.crop.findMany({
            orderBy: { name: 'asc' }
        });

        console.log(`📊 Total crops in database: ${crops.length}\n`);
        console.log('Crops:');
        crops.forEach(c => {
            console.log(`  ${c.icon || '❓'} ${c.name} (ID: ${c.id.substring(0, 8)}..., Active: ${c.isActive})`);
        });

        // Check for duplicate crop names
        const cropNames = crops.map(c => c.name);
        const duplicateNames = cropNames.filter((name, index) => cropNames.indexOf(name) !== index);

        if (duplicateNames.length > 0) {
            console.log('\n⚠️  DUPLICATE CROP NAMES FOUND:');
            duplicateNames.forEach(name => {
                const dupes = crops.filter(c => c.name === name);
                console.log(`  ${name}: ${dupes.length} entries`);
                dupes.forEach(d => console.log(`    - ID: ${d.id}, Icon: ${d.icon}`));
            });
        } else {
            console.log('\n✅ No duplicate crop names');
        }

        // Check market prices
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const prices = await prisma.marketPrice.findMany({
            where: { date: { gte: today } },
            include: { crop: true },
            orderBy: { crop: { name: 'asc' } }
        });

        console.log(`\n📈 Total market prices for today: ${prices.length}\n`);
        console.log('Market Prices:');
        prices.forEach(p => {
            console.log(`  ${p.crop.icon || '❓'} ${p.crop.name}: ₹${p.min}-${p.max} (avg: ₹${p.avg}) @ ${p.mandi}`);
        });

        // Check for duplicate prices (same crop, multiple entries)
        const cropIds = prices.map(p => p.cropId);
        const duplicatePrices = cropIds.filter((id, index) => cropIds.indexOf(id) !== index);

        if (duplicatePrices.length > 0) {
            console.log('\n⚠️  DUPLICATE MARKET PRICES FOUND:');
            const uniqueDupes = [...new Set(duplicatePrices)];
            for (const cropId of uniqueDupes) {
                const dupes = prices.filter(p => p.cropId === cropId);
                const crop = dupes[0].crop;
                console.log(`  ${crop.icon} ${crop.name}: ${dupes.length} entries`);
            }
        } else {
            console.log('\n✅ No duplicate market prices');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabase();
