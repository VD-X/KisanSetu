const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const listingController = require('../src/controllers/listingController');
const orderController = require('../src/controllers/orderController');
const deliveryDealController = require('../src/controllers/deliveryDealController');

// Mock helpers
const mockReq = (user, body = {}, query = {}, params = {}) => ({
    user,
    body,
    query,
    params,
    app: { get: () => null } // mock io
});

const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function main() {
    try {
        console.log('Starting Visibility Verification...');
        
        // 1. Create Users
        const suffix = Math.floor(Math.random() * 100000);
        
        const farmer = await createUser('FARMER', `farmer_v_${suffix}`);
        const buyer1 = await createUser('BUYER', `buyer1_v_${suffix}`);
        const buyer2 = await createUser('BUYER', `buyer2_v_${suffix}`);
        const transporter = await createUser('TRANSPORTER', `trans_v_${suffix}`);

        console.log('Users created.');

        // 2. Create Listing (Farmer)
        // Need a valid crop ID.
        const crop = await prisma.crop.findFirst();
        if (!crop) throw new Error('No crops found in DB');

        const reqCreateListing = mockReq(farmer, {
             cropId: crop.id,
             quantity: 1000,
             unit: 'kg',
             expectedPrice: 20,
             grade: 'A',
             harvestDate: new Date(),
             harvestType: 'HARVESTED_CROP',
             location: 'Test Village'
        });
        
        const resCreateListing = mockRes();
        await listingController.createListing(reqCreateListing, resCreateListing);
        const listing = resCreateListing.data.listing;
        console.log('Listing created:', listing.id);

        // 3. Buyer View Listing (Public)
        const reqGetListings = mockReq(buyer1, {}, {});
        const resGetListings = mockRes();
        await listingController.getAllListings(reqGetListings, resGetListings);
        
        const publicListing = resGetListings.data.listings.find(l => l.id === listing.id);
        if (publicListing.farmer.phone || publicListing.farmer.village) {
            console.error('FAIL: Public listing exposes phone/village!', publicListing.farmer);
        } else {
            console.log('PASS: Public listing hides phone/village.');
        }

        // 4. Buyer1 Create Order
        const reqCreateOrder = mockReq(buyer1, {
            listingId: listing.id,
            quantity: 100,
            priceFinal: 2000,
            deliveryResponsibility: 'BUYER_ARRANGED'
        });
        const resCreateOrder = mockRes();
        await orderController.createOrder(reqCreateOrder, resCreateOrder);
        const order = resCreateOrder.data.order;
        console.log('Order created:', order.id);

        // 5. Buyer1 Create Delivery Deal
        const reqCreateDeal = mockReq(buyer1, {
            orderId: order.id,
            pickupLocation: { address: 'Farm Address', lat: 10, lng: 20 },
            dropLocation: { address: 'Buyer Address', lat: 11, lng: 21 },
            pricePerKm: 10,
            distance: 50
        });
        const resCreateDeal = mockRes();
        await deliveryDealController.createDeliveryDeal(reqCreateDeal, resCreateDeal);
        const deal = resCreateDeal.data.deliveryDeal;
        console.log('Delivery Deal created:', deal.id);

        // 6. Transporter View Available Deals
        const reqGetDeals = mockReq(transporter);
        const resGetDeals = mockRes();
        await deliveryDealController.getAvailableDeals(reqGetDeals, resGetDeals);
        
        const availableDeal = resGetDeals.data.deals.find(d => d.id === deal.id);
        if (!availableDeal) {
            console.error('FAIL: Deal not found for transporter');
        } else {
            if (availableDeal.pickupOtp || availableDeal.deliveryOtp) {
                console.error('FAIL: Available deal exposes OTP!');
            } else {
                console.log('PASS: Available deal hides OTP.');
            }
            if (availableDeal.pickupLocation.address && !availableDeal.pickupLocation.address.includes('hidden')) {
                 console.error('FAIL: Available deal exposes address!', availableDeal.pickupLocation);
            } else if (availableDeal.pickupLocation.address) {
                 console.log('PASS: Available deal address is redacted/hidden text:', availableDeal.pickupLocation.address);
            } else {
                 console.error('FAIL: Available deal address is missing/undefined!');
            }
        }

        // 7. Transporter Accept Deal
        const reqAccept = mockReq(transporter, {}, {}, { id: deal.id });
        const resAccept = mockRes();
        await deliveryDealController.acceptDeal(reqAccept, resAccept);
        console.log('Deal Accepted status:', resAccept.statusCode || 200);
        if (resAccept.statusCode !== 200) {
            console.error('Accept Deal Error:', resAccept.data);
        }

        // 8. Transporter View My Deals
        const resGetMyDeals = mockRes();
        await deliveryDealController.getAvailableDeals(reqGetDeals, resGetMyDeals);
        const myDeal = resGetMyDeals.data.deals.find(d => d.id === deal.id);
        
        if (myDeal) {
            // Check if address is visible now
            if (myDeal.pickupLocation.address === 'Farm Address') {
                 console.log('PASS: Accepted deal shows full address.');
            } else {
                 console.error('FAIL: Accepted deal address mismatch or hidden:', myDeal.pickupLocation);
            }
            
            if (myDeal.pickupOtp || myDeal.deliveryOtp) {
                 console.error('FAIL: Accepted deal exposes OTP!');
            } else {
                 console.log('PASS: Accepted deal hides OTP.');
            }
        } else {
            console.error('FAIL: Accepted deal not found in list');
        }

        // 9. Buyer2 View Orders (Should NOT see Buyer1's order)
        const reqGetOrders2 = mockReq(buyer2);
        const resGetOrders2 = mockRes();
        await orderController.getOrders(reqGetOrders2, resGetOrders2);
        
        const orders2 = resGetOrders2.data.orders;
        const found = orders2.find(o => o.id === order.id);
        if (found) {
            console.error('FAIL: Buyer2 can see Buyer1 order!');
        } else {
            console.log('PASS: Buyer2 cannot see Buyer1 order.');
        }

    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

async function createUser(role, prefix) {
    const email = `${prefix}@test.com`;
    const user = await prisma.user.create({
        data: {
            email,
            password: 'hash',
            role,
            status: 'ACTIVE'
        }
    });
    
    if (role === 'FARMER') {
        await prisma.farmerProfile.create({
            data: {
                userId: user.id,
                fullName: prefix,
                phone: '1234567890',
                village: 'VillageA',
                district: 'DistrictA',
                state: 'StateA',
                gender: 'MALE',
                landSize: 5
            }
        });
    } else if (role === 'BUYER') {
        await prisma.buyerProfile.create({
            data: {
                userId: user.id,
                fullName: prefix,
                phone: '0987654321',
                city: 'CityB',
                state: 'StateB',
                gender: 'FEMALE'
            }
        });
    } else if (role === 'TRANSPORTER') {
        await prisma.transporterProfile.create({
            data: {
                userId: user.id,
                fullName: prefix,
                phone: '1122334455',
                vehicleType: 'Truck',
                vehicleNumber: 'TN01AB1234',
                capacity: 1000,
                pricePerKm: 10,
                gender: 'MALE'
            }
        });
    }
    return user;
}

main();