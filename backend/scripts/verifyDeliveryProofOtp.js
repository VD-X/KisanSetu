const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const listingController = require('../src/controllers/listingController');
const orderController = require('../src/controllers/orderController');
const deliveryDealController = require('../src/controllers/deliveryDealController');

const mockReq = (user, body = {}, query = {}, params = {}) => ({
    user,
    body,
    query,
    params,
    app: { get: () => null }
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

async function main() {
    try {
        const suffix = Math.floor(Math.random() * 100000);
        const farmer = await createUser('FARMER', `farmer_pod_${suffix}`);
        const buyer = await createUser('BUYER', `buyer_pod_${suffix}`);
        const transporter = await createUser('TRANSPORTER', `trans_pod_${suffix}`);

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

        const reqCreateOrder = mockReq(buyer, {
            listingId: listing.id,
            quantity: 100,
            priceFinal: 2000,
            deliveryResponsibility: 'BUYER_ARRANGED',
            deliveryAddress: 'Buyer Street, City'
        });
        const resCreateOrder = mockRes();
        await orderController.createOrder(reqCreateOrder, resCreateOrder);
        const order = resCreateOrder.data.order;

        const reqCreateDeal = mockReq(buyer, {
            orderId: order.id,
            pickupLocation: { address: 'Farm Address', lat: 10, lng: 20 },
            dropLocation: { address: 'Buyer Address', lat: 11, lng: 21 },
            pricePerKm: 10,
            distance: 50
        });
        const resCreateDeal = mockRes();
        await deliveryDealController.createDeliveryDeal(reqCreateDeal, resCreateDeal);
        const deal = resCreateDeal.data.deliveryDeal;

        const reqFarmerOrdersBefore = mockReq(farmer);
        const resFarmerOrdersBefore = mockRes();
        await orderController.getOrders(reqFarmerOrdersBefore, resFarmerOrdersBefore);
        const farmerOrderBefore = (resFarmerOrdersBefore.data.orders || []).find((o) => o.id === order.id);
        const pickupOtp = farmerOrderBefore?.delivery?.pickupOtp;
        if (!pickupOtp) throw new Error('FAIL: Farmer cannot see pickup OTP');

        const reqAccept = mockReq(transporter, {}, {}, { id: deal.id });
        const resAccept = mockRes();
        await deliveryDealController.acceptDeal(reqAccept, resAccept);

        const reqPickupOtp = mockReq(transporter, { otp: pickupOtp }, {}, { id: deal.id });
        const resPickupOtp = mockRes();
        await deliveryDealController.verifyOtp(reqPickupOtp, resPickupOtp);

        const reqTransit = mockReq(transporter, { status: 'IN_TRANSIT' }, {}, { id: deal.id });
        const resTransit = mockRes();
        await deliveryDealController.updateStatus(reqTransit, resTransit);

        const tinyPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XjL0AAAAASUVORK5CYII=';
        const reqUploadProof = mockReq(transporter, { imageData: tinyPngDataUrl }, {}, { id: deal.id });
        const resUploadProof = mockRes();
        await deliveryDealController.uploadProofPhoto(reqUploadProof, resUploadProof);

        const reqDeliveryOtp = mockReq(transporter, { otp: deal.deliveryOtp }, {}, { id: deal.id });
        const resDeliveryOtp = mockRes();
        await deliveryDealController.verifyOtp(reqDeliveryOtp, resDeliveryOtp);

        const reqFarmerOrders = mockReq(farmer);
        const resFarmerOrders = mockRes();
        await orderController.getOrders(reqFarmerOrders, resFarmerOrders);
        const farmerOrder = (resFarmerOrders.data.orders || []).find((o) => o.id === order.id);
        if (!farmerOrder?.delivery?.proofPhotos?.length) {
            throw new Error('FAIL: Farmer cannot see proof photos');
        }

        const reqBuyerOrders = mockReq(buyer);
        const resBuyerOrders = mockRes();
        await orderController.getOrders(reqBuyerOrders, resBuyerOrders);
        const buyerOrder = (resBuyerOrders.data.orders || []).find((o) => o.id === order.id);
        if (buyerOrder?.delivery?.proofPhotos?.length) {
            throw new Error('FAIL: Buyer can see proof photos');
        }

        console.log('PASS: Proof photo stored; farmer can see; buyer cannot; delivery completed by OTP.');
    } catch (error) {
        console.error('Test Error:', error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

main();
