
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createEarningsService } = require('../src/services/earningsService');

function log(msg) {
    fs.appendFileSync('verify_log.txt', msg + '\n');
    console.log(msg);
}

async function verifyDeliveryCost() {
    log('--- Starting Delivery Cost Verification ---');

    try {
        // ... (rest of function use log instead of console.log)

        // 1. Create fresh test data to avoid data integrity issues
        log('Creating fresh test data...');

        // Find or create a farmer and buyer
        let farmer = await prisma.user.findFirst({ where: { role: 'FARMER' } });
        let buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });

        if (!farmer || !buyer) {
            throw new Error('Seed data missing (Farmer/Buyer)');
        }

        // Create a dummy listing
        const listing = await prisma.listing.create({
            data: {
                farmerId: farmer.id,
                cropId: (await prisma.crop.findFirst()).id,
                quantity: 100,
                expectedPrice: 20,
                grade: 'A',
                harvestDate: new Date(),
                location: 'Test Farm',
                status: 'AVAILABLE'
            }
        });

        // Create a dummy order
        const order = await prisma.order.create({
            data: {
                listingId: listing.id,
                buyerId: buyer.id,
                farmerId: farmer.id,
                quantity: 10,
                priceFinal: 100,
                deliveryResponsibility: 'BUYER_ARRANGED',
                orderStatus: 'ORDER_CREATED'
            }
        });

        log(`Created dummy listing: ${listing.id}`);
        log(`Created dummy order: ${order.id}`);

        // 2. Simulate Frontend sending 'totalCost'
        const inputDistance = 50; // km
        const inputPricePerKm = 10; // rs/km
        const calculatedTotalCost = 750; // Frontend calculates higher than dist*price (e.g. base price included)

        log(`Simulating Delivery Deal creation with:`);
        log(`- Distance: ${inputDistance}km`);
        log(`- Rate: ₹${inputPricePerKm}/km`);
        log(`- Frontend Calculated Cost: ₹${calculatedTotalCost} (Should be preserved)`);
        log(`- Backend Simple Calc would be: ₹${inputDistance * inputPricePerKm}`);

        const transporter = await prisma.user.findFirst({ where: { role: 'TRANSPORTER' } });
        log('Transporter found: ' + transporter?.id);

        const deliveryData = {
            orderId: order.id,
            pickupLocation: { address: 'Test Pickup', lat: 10, lng: 10 },
            dropLocation: { address: 'Test Drop', lat: 10.5, lng: 10.5 },
            pricePerKm: inputPricePerKm,
            distance: inputDistance,
            totalCost: calculatedTotalCost,
            status: 'COMPLETED',
            transporterId: transporter?.id
        };
        log('Creating delivery with data: ' + JSON.stringify(deliveryData, null, 2));

        const delivery = await prisma.delivery.create({
            data: deliveryData
        });

        log(`Delivery created: ${delivery.id}`);
        log(`Stored totalCost: ${delivery.totalCost}`);

        if (delivery.totalCost !== calculatedTotalCost) {
            throw new Error(`FAILED: Stored totalCost (${delivery.totalCost}) does not match input (${calculatedTotalCost})`);
        } else {
            log('SUCCESS: Delivery totalCost matches input.');
        }

        // 3. Test Earnings Calculation
        if (!delivery.transporterId) {
            log('Skipping earnings test: No transporter found in DB');
            return;
        }

        log('Triggering Earnings Update...');
        const earningsService = createEarningsService(prisma);
        const result = await earningsService.triggerEarningsUpdateAfterCompletion(delivery.id, null); // null for io

        if (result && result.earning) {
            log('Earning record created: ' + JSON.stringify(result.earning));
            // Verify the amount
            // The service might add tip/surge, but baseAmount should match totalCost
            if (result.earning.baseAmount === calculatedTotalCost) {
                log('SUCCESS: Earning baseAmount matches delivery totalCost.');
            } else {
                log(`FAILED: Earning baseAmount (${result.earning.baseAmount}) != Delivery totalCost (${calculatedTotalCost})`);
            }

            // Cleanup
            await prisma.earning.delete({ where: { id: result.earning.id } });
            await prisma.transaction.deleteMany({ where: { description: `Earnings for Delivery #${delivery.id.slice(-6)}` } });
        } else {
            log('FAILED: No earning result returned.');
        }

        // Cleanup Delivery
        await prisma.delivery.delete({ where: { id: delivery.id } });
        await prisma.order.delete({ where: { id: order.id } });
        await prisma.listing.delete({ where: { id: listing.id } }); // rough cleanup if we made it

    } catch (error) {
        log('Verification Failed!');
        log('Error Message: ' + error.message);
        log('Error Code: ' + error.code);
    } finally {
        await prisma.$disconnect();
    }
}

verifyDeliveryCost();
