const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // Assuming bcryptjs is installed as per seed-admin.js

const prisma = new PrismaClient();

async function seedListings() {
    try {
        console.log('🌱 Seeding listings...');

        // 1. Get or Create Farmer
        let farmer = await prisma.user.findFirst({ where: { role: 'FARMER' } });

        if (!farmer) {
            console.log('No farmer found, creating one...');
            const hashedPassword = await bcrypt.hash('password123', 10);

            farmer = await prisma.user.create({
                data: {
                    email: 'farmer_demo@test.com',
                    password: hashedPassword,
                    role: 'FARMER',
                    status: 'ACTIVE',
                    farmerProfile: {
                        create: {
                            fullName: 'Ramesh Kumar',
                            phone: '9876543210',
                            village: 'Rampur',
                            district: 'Pune',
                            state: 'Maharashtra',
                            gender: 'MALE',
                            landSize: 5
                        }
                    }
                }
            });
            console.log(`Created farmer: ${farmer.email}`);
        } else {
            console.log(`Using existing farmer: ${farmer.email} (ID: ${farmer.id})`);
        }

        // 2. Get Crops
        const crops = await prisma.crop.findMany();
        if (crops.length === 0) {
            console.error('❌ No crops found! Run cleanAndReseed.js first.');
            return;
        }

        // 3. Create Sample Listings
        const listingsData = [
            { cropName: 'Tomato', qty: 500, price: 25, grade: 'A', type: 'HARVESTED_CROP', images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80'] },
            { cropName: 'Potato', qty: 1000, price: 18, grade: 'B', type: 'HARVESTED_CROP', images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80'] },
            { cropName: 'Onion', qty: 2000, price: 30, grade: 'A', type: 'HARVESTED_CROP', images: ['https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=800&q=80'] },
            { cropName: 'Wheat', qty: 5000, price: 22, grade: 'A', type: 'STANDING_CROP', images: ['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80'] },
            { cropName: 'Rice', qty: 3000, price: 45, grade: 'A', type: 'PROCESSED_CLEANED_CROP', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80'] },
            { cropName: 'Cotton', qty: 800, price: 60, grade: 'A', type: 'HARVESTED_CROP', images: ['https://images.unsplash.com/photo-1594910064119-218ef7747805?auto=format&fit=crop&w=800&q=80'] },
        ];

        let count = 0;
        for (const item of listingsData) {
            const crop = crops.find(c => c.name.toLowerCase() === item.cropName.toLowerCase());

            if (!crop) {
                console.warn(`⚠️ Crop ${item.cropName} not found in DB, skipping.`);
                continue;
            }

            // Check if similar listing already exists to filter duplicates
            const existing = await prisma.listing.findFirst({
                where: {
                    farmerId: farmer.id,
                    cropId: crop.id,
                    expectedPrice: item.price
                }
            });

            if (!existing) {
                await prisma.listing.create({
                    data: {
                        farmerId: farmer.id,
                        cropId: crop.id,
                        quantity: item.qty,
                        unit: 'kg',
                        expectedPrice: item.price,
                        mandiPrice: item.price - 2, // Simple logic
                        msp: item.price - 5,
                        grade: item.grade,
                        harvestDate: new Date(),
                        harvestType: item.type,
                        status: 'AVAILABLE',
                        location: 'Pune, Maharashtra',
                        images: item.images
                    }
                });
                console.log(`✅ Created listing for ${item.cropName}`);
                count++;
            } else {
                console.log(`ℹ️ Listing for ${item.cropName} already exists.`);
            }
        }

        console.log(`\n✨ Done! Created ${count} new listings.`);

    } catch (e) {
        console.error('❌ Error seeding listings:', e);
    } finally {
        await prisma.$disconnect();
    }
}

seedListings();
