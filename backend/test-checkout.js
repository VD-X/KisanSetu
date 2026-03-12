
const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5000/api';
let formattedTime = new Date().toISOString();

async function runTest() {
    console.log('🚀 Starting Backend Integration Test...');

    // 1. Setup Data directly in DB to avoid registration flow complexity
    console.log('📦 Setting up test data...');

    // Create Farmer
    const farmer = await prisma.user.upsert({
        where: { email: 'testfarmer@example.com' },
        update: {},
        create: {
            email: 'testfarmer@example.com',
            password: 'password123',
            role: 'FARMER',
            farmerProfile: {
                create: {
                    fullName: 'Test Farmer',
                    gender: 'MALE',
                    phone: '1234567890',
                    landSize: 5.0,
                    village: 'Test Village',
                    district: 'Test District',
                    state: 'Test State',
                    language: 'ENGLISH'
                }
            }
        }
    });

    // Create Buyer via API to get token
    const uniqueId = Date.now();
    const buyerEmail = `buyer${uniqueId}@test.com`;

    console.log(`👤 Registering Buyer: ${buyerEmail}`);
    const registerRes = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: buyerEmail,
            password: 'password123',
            role: 'BUYER',
            profileData: {
                fullName: 'Test Buyer',
                phone: '9876543210',
                gender: 'MALE',
                city: 'Test City',
                state: 'Test State',
                language: 'ENGLISH'
            }
        })
    });

    if (!registerRes.ok) {
        throw new Error(`Failed to register buyer: ${await registerRes.text()}`);
    }

    const buyerAuth = await registerRes.json();
    if (!buyerAuth.token) {
        throw new Error(`Failed to register buyer: ${JSON.stringify(buyerAuth)}`);
    }
    const token = buyerAuth.token;
    console.log('✅ Buyer Registered & Logged In');

    // Create a Listing directly in DB (to assume farmer exists and has listing)
    const crop = await prisma.crop.findFirst();
    if (!crop) throw new Error('No crops found in DB. Please seed crops first.');

    const listing = await prisma.listing.create({
        data: {
            farmerId: farmer.id,
            cropId: crop.id,
            quantity: 100,
            unit: 'kg',
            expectedPrice: 50,
            grade: 'A',
            harvestDate: new Date(),
            status: 'AVAILABLE',
            location: 'Test Farm Location',
            images: []
        }
    });
    console.log(`🌾 Created Test Listing: ${listing.id}`);

    if (!/^[0-9a-fA-F]{24}$/.test(listing.id)) {
        console.warn('⚠️ Listing ID format might not match backend validation regex');
    }

    // 2. Add to Cart
    console.log('🛒 Adding to Cart...');
    const addRes = await fetch(`${BASE_URL}/cart/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            listingId: listing.id,
            quantity: 10
        })
    });

    if (!addRes.ok) {
        const text = await addRes.text();
        console.error(`❌ Add to Cart Failed: Status ${addRes.status}`);
        console.error('Response:', text);
        throw new Error(`Failed to add to cart: ${text}`);
    }
    console.log('✅ Item added to cart');

    // 3. Checkout with Location
    console.log('🚚 Checking out with Location Data...');
    const locationData = {
        deliveryResponsibility: 'FARMER_ARRANGED',
        deliveryLatitude: 12.9716,
        deliveryLongitude: 77.5946,
        deliveryAddress: 'Cubbon Park, Bengaluru, Karnataka',
        distanceKm: 15.5,
        estimatedDuration: 45
    };

    const checkoutRes = await fetch(`${BASE_URL}/cart/checkout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(locationData)
    });

    const checkoutData = await checkoutRes.json();
    if (!checkoutRes.ok) throw new Error(`Checkout failed: ${JSON.stringify(checkoutData)}`);

    console.log('✅ Checkout Successful:', checkoutData.message);
    const orderId = checkoutData.orders[0].id;

    // 4. Verify Order Data
    console.log('🔍 Verifying Order Location Data...');
    const orderRes = await fetch(`${BASE_URL}/orders`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const orderData = await orderRes.json();
    const order = orderData.orders.find(o => o.id === orderId);

    if (!order) throw new Error('Order not found in history');

    console.log('📄 Order Details:', {
        id: order.id,
        address: order.deliveryAddress,
        distance: order.distanceKm,
        duration: order.estimatedDuration
    });

    if (order.deliveryAddress === locationData.deliveryAddress &&
        order.distanceKm === locationData.distanceKm) {
        console.log('🎉 TEST PASSED: Location data preserved correctly!');
    } else {
        console.error('❌ TEST FAILED: Location data mismatch');
        console.log('Expected:', locationData);
        console.log('Received:', {
            deliveryAddress: order.deliveryAddress,
            distanceKm: order.distanceKm
        });
    }

    // Cleanup
    console.log('🧹 Cleaning up...');
    try {
        await prisma.order.delete({ where: { id: orderId } });
        await prisma.listing.delete({ where: { id: listing.id } });
        // Buyer cleanup is optional but good
        await prisma.buyerProfile.delete({ where: { userId: buyerAuth.user.id } });
        await prisma.user.delete({ where: { id: buyerAuth.user.id } });
    } catch (e) {
        console.warn('⚠️ Cleanup incomplete:', e.message);
    }
}

runTest()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
