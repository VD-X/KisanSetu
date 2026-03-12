const { io } = require("socket.io-client");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const prisma = new PrismaClient();
const API_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";
const JWT_SECRET = process.env.JWT_SECRET;

async function runVerification() {
    console.log("🚀 Starting Real-time Vehicle Matching Verification...");

    try {
        // 1. Setup Data
        console.log("🛠️  Setting up test data...");

        // Find or create a Farmer (to create order)
        let farmer = await prisma.user.findFirst({ where: { role: "FARMER" } });
        if (!farmer) throw new Error("No farmer found. Run seeder first.");

        // Find or create a Buyer (for the order)
        let buyer = await prisma.user.findFirst({ where: { role: "BUYER" } });
        if (!buyer) throw new Error("No buyer found. Run seeder first.");

        // Find or create a Transporter (Mini Truck)
        // We need a transporter who has 'mini' as vehicleType
        let transporterMini = await prisma.transporterProfile.findFirst({
            where: { vehicleType: 'mini' },
            include: { user: true }
        });

        // If not found, find ANY transporter and update/create profile
        if (!transporterMini) {
            let tUser = await prisma.user.findFirst({ where: { role: "TRANSPORTER" } });
            if (!tUser) throw new Error("No transporter user found.");

            // Upsert profile to have 'mini'
            transporterMini = await prisma.transporterProfile.upsert({
                where: { userId: tUser.id },
                update: { vehicleType: 'mini' },
                create: {
                    userId: tUser.id,
                    fullName: "Test Transporter Mini",
                    vehicleType: 'mini',
                    gender: "MALE",
                    phone: "1234567890",
                    vehicleNumber: "MH12AB1234",
                    capacity: 750,
                    pricePerKm: 20
                },
                include: { user: true }
            });
            console.log("   -> Updated/Created 'mini' transporter profile.");
        }
        console.log(`   -> Using Transporter (Mini): ${transporterMini.user.id}`);


        // Create a dummy Order (if needed) to attach delivery to
        // We need a listing first
        let listing = await prisma.listing.findFirst({ where: { farmerId: farmer.id } });
        if (!listing) throw new Error("Farmer has no listings.");

        // Create Order
        const order = await prisma.order.create({
            data: {
                listingId: listing.id,
                buyerId: buyer.id,
                farmerId: farmer.id,
                quantity: 100,
                priceFinal: 1000,
                orderStatus: 'ORDER_CREATED',
                deliveryResponsibility: 'FARMER_ARRANGED' // Important for auth check
            }
        });
        console.log(`   -> Created Test Order: ${order.id}`);


        // 2. Generate Tokens
        const farmerToken = jwt.sign({ id: farmer.id, role: farmer.role }, JWT_SECRET, { expiresIn: '1h' });
        const transporterToken = jwt.sign({ id: transporterMini.user.id, role: transporterMini.user.role }, JWT_SECRET, { expiresIn: '1h' });


        // 3. Connect Socket (Transporter)
        console.log("🔌 Connecting Transporter Socket...");
        const socket = io(SOCKET_URL, {
            transports: ['websocket'],
            forceNew: true
        });

        await new Promise((resolve) => {
            socket.on("connect", () => {
                console.log("   -> Socket connected:", socket.id);
                // Identify
                socket.emit("identify", transporterMini.user.id);
                // Join Vehicle Room (Frontend does this manually)
                socket.emit("join-vehicle-room", "mini");
                setTimeout(resolve, 500); // Give it a moment to join
            });
        });


        // 4. Test Case 1: Create Delivery for 'mini' (Should Receive)
        console.log("\n🧪 Test Case 1: Creating Delivery for 'mini'...");

        let receivedEvent = null;
        socket.on("delivery:created", (data) => {
            console.log("   -> 📨 Received 'delivery:created' event!");
            receivedEvent = data;
        });

        // Call API to create deal
        const dealData = {
            orderId: order.id,
            pickupLocation: "Test Pickup",
            dropLocation: "Test Drop",
            distance: 10,
            pricePerKm: 20,
            selectedVehicle: 'mini', // MATCHING
            totalCost: 200
        };

        // We need a valid pickup/drop object format usually, controller handles string to object? 
        // Checking controller... resolvePickupLocation handles string input if farmer profile has location.
        // Let's assume sending simple strings works or fails. 
        // To be safe, let's look at controller inputs. 
        // It accepts `pickupLocation` object or string?
        // Controller: `resolvePickupLocation({ pickupInput: pickupLocation ... })`.
        // It mocks GPS coords if missing? Probably good enough.

        try {
            await axios.post(`${API_URL}/delivery-deals/create`, dealData, {
                headers: { Authorization: `Bearer ${farmerToken}` }
            });
            console.log("   -> Delivery API called successfully.");
        } catch (e) {
            console.error("   -> API Call Failed:", e.response?.data || e.message);
            throw e;
        }

        // Wait for event
        await new Promise(r => setTimeout(r, 2000));

        if (receivedEvent && receivedEvent.deliveryDeal.selectedVehicle === 'mini') {
            console.log("✅ SUCCESS: Transporter received the matching delivery request.");
        } else {
            console.error("❌ FAILURE: Transporter did NOT receive the event.");
            process.exit(1);
        }


        // 5. Test Case 2: Create Delivery for 'truck' (Should NOT Receive)
        console.log("\n🧪 Test Case 2: Creating Delivery for 'truck' (Mismatch)...");
        receivedEvent = null; // Reset

        // We need another order because 1 order = 1 delivery usually?
        // Controller check: `if (existingDelivery) return 400`.
        // So create another order.
        const order2 = await prisma.order.create({
            data: {
                listingId: listing.id,
                buyerId: buyer.id,
                farmerId: farmer.id,
                quantity: 100,
                priceFinal: 1000,
                orderStatus: 'ORDER_CREATED',
                deliveryResponsibility: 'FARMER_ARRANGED'
            }
        });

        const dealData2 = {
            orderId: order2.id,
            pickupLocation: "Test Pickup 2",
            dropLocation: "Test Drop 2",
            distance: 10,
            pricePerKm: 50,
            selectedVehicle: 'truck', // NOT MATCHING 'mini'
            totalCost: 500
        };

        try {
            await axios.post(`${API_URL}/delivery-deals/create`, dealData2, {
                headers: { Authorization: `Bearer ${farmerToken}` }
            });
            console.log("   -> Delivery API called successfully.");
        } catch (e) {
            console.error("   -> API Call Failed:", e.response?.data || e.message);
            throw e;
        }

        // Wait
        await new Promise(r => setTimeout(r, 2000));

        if (receivedEvent) {
            console.error("❌ FAILURE: Transporter received a NON-MATCHING delivery request!");
        } else {
            console.log("✅ SUCCESS: Transporter mocked ignored the non-matching request (no event received).");
        }

        // Cleanup
        console.log("\n🧹 Cleaning up...");
        // Delete created deliveries and orders
        // (Optional, but good practice)
        await prisma.delivery.deleteMany({ where: { orderId: { in: [order.id, order2.id] } } });
        await prisma.order.deleteMany({ where: { id: { in: [order.id, order2.id] } } });

        socket.disconnect();
        console.log("\n✨ Verification Complete!");

    } catch (error) {
        console.error("\n❌ Verification Failed:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runVerification();
