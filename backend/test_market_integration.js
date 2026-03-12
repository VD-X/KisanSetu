const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { getPriceForCrop, clearCache } = require('./src/services/marketPriceService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('ENV CHECK:');
console.log('AGMARKNET_API_KEY:', process.env.AGMARKNET_API_KEY ? 'Present' : 'Missing');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');

async function verify() {
    try {
        console.log('Verifying Market Price Service Integration...');

        // Clear cache to force fresh fetch
        clearCache();

        // Set location to match Agmarknet data
        const location = 'Gujarat';

        // Get a crop (e.g., Tomato or Onion)
        const crops = await prisma.crop.findMany({ where: { isActive: true }, take: 5 });
        if (crops.length === 0) {
            console.log('No crops found in DB. Please run seeding first.');
            return;
        }

        const testCrop = crops.find(c => c.name === 'Onion') || crops[0];
        console.log(`Testing with crop: ${testCrop.name} (ID: ${testCrop.id})`);

        const result = await getPriceForCrop(testCrop.id, 'Gujarat');

        console.log('RESULT:');
        console.log(JSON.stringify(result, null, 2));

        if (result.variety) {
            console.log('✅ Variety captured:', result.variety);
        } else {
            console.log('❌ Variety missing');
        }

        if (result.analytics) {
            console.log('✅ AI Analytics generated:', result.analytics);
        } else {
            console.log('❌ AI Analytics missing');
        }

    } catch (err) {
        console.error('Extraction Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
