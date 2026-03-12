const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearCacheAndVerify() {
    try {
        console.log('🔄 Clearing cache and verifying data...\n');

        // Get all crops with icons
        const crops = await prisma.crop.findMany({
            where: { isActive: true },
            select: { id: true, name: true, icon: true },
            orderBy: { name: 'asc' }
        });

        console.log(`📊 Found ${crops.length} active crops:\n`);
        crops.forEach(c => {
            console.log(`  ${c.icon || '❌'} ${c.name} (ID: ${c.id.substring(0, 8)}...)`);
        });

        // Get market prices with crop data
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const prices = await prisma.marketPrice.findMany({
            where: { date: { gte: today } },
            include: {
                crop: {
                    select: { id: true, name: true, icon: true }
                }
            },
            orderBy: { crop: { name: 'asc' } }
        });

        console.log(`\n📈 Found ${prices.length} market prices:\n`);
        prices.forEach(p => {
            console.log(`  ${p.crop.icon || '❌'} ${p.crop.name}: ₹${p.min}-${p.max} (avg: ₹${p.avg})`);
        });

        // Check if icons are present
        const cropsWithoutIcons = crops.filter(c => !c.icon);
        if (cropsWithoutIcons.length > 0) {
            console.log(`\n⚠️  WARNING: ${cropsWithoutIcons.length} crops missing icons!`);
            cropsWithoutIcons.forEach(c => console.log(`   - ${c.name}`));
        } else {
            console.log('\n✅ All crops have icons in database!');
        }

        console.log('\n💡 The backend cache will be cleared on next server restart.');
        console.log('   Restart the backend server to clear the in-memory cache.\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearCacheAndVerify();
