const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Seeding Crops...');
        const crops = [
            { name: 'Tomato', category: 'Vegetable', icon: '🍅' },
            { name: 'Wheat', category: 'Grain', icon: '🌾' },
            { name: 'Onion', category: 'Vegetable', icon: '🧅' },
            { name: 'Rice', category: 'Grain', icon: '🍚' },
            { name: 'Potato', category: 'Vegetable', icon: '🥔' },
            { name: 'Cotton', category: 'Cash Crop', icon: '🌱' },
            { name: 'Sugarcane', category: 'Cash Crop', icon: '🎋' },
            { name: 'Maize', category: 'Grain', icon: '🌽' },
            { name: 'Chilli', category: 'Spice', icon: '🌶️' },
            { name: 'Turmeric', category: 'Spice', icon: '🟡' },
            { name: 'Groundnut', category: 'Oilseed', icon: '🥜' },
            { name: 'Soybean', category: 'Pulse', icon: '🫘' },
            { name: 'Chickpea', category: 'Pulse', icon: '🫘' },
            { name: 'Mustard', category: 'Oilseed', icon: '🟨' },
            { name: 'Sunflower', category: 'Oilseed', icon: '🌻' },
        ];

        for (const cropData of crops) {
            await prisma.crop.upsert({
                where: { id: '000000000000000000000000' }, // Dummy since we use name for check
                update: {},
                create: cropData,
            });
        }

        const dbCrops = await prisma.crop.findMany();
        const tomato = dbCrops.find(c => c.name === 'Tomato');
        const wheat = dbCrops.find(c => c.name === 'Wheat');

        const farmerId = '698200f95b065b9288cea543'; // From check-users.js

        console.log('Seeding Listings...');
        const listings = [
            {
                farmerId,
                cropId: tomato.id,
                quantity: 1200,
                unit: 'kg',
                expectedPrice: 28,
                mandiPrice: 24,
                grade: 'A',
                harvestDate: new Date(),
                images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400'],
                location: 'Guntur, AP',
                status: 'AVAILABLE'
            },
            {
                farmerId,
                cropId: wheat.id,
                quantity: 5000,
                unit: 'kg',
                expectedPrice: 18,
                mandiPrice: 20,
                grade: 'B',
                harvestDate: new Date(),
                images: ['https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=400'],
                location: 'Kurnool, AP',
                status: 'AVAILABLE'
            }
        ];

        for (const listData of listings) {
            await prisma.listing.create({ data: listData });
        }

        console.log('Seeding completed successfully!');
    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
