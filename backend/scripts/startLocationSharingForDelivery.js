const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function startLocationSharingForDelivery(deliveryId) {
  console.log(`🔧 Starting location sharing for delivery: ${deliveryId}\n`);
  
  try {
    // Find the delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: {
          include: {
            farmer: true,
            buyer: true
          }
        },
        transporter: true
      }
    });

    if (!delivery) {
      console.log(`❌ Delivery ${deliveryId} not found`);
      return false;
    }

    console.log(`📋 Delivery Details:`);
    console.log(`   ID: ${delivery.id}`);
    console.log(`   Status: ${delivery.status}`);
    console.log(`   Transporter: ${delivery.transporter?.name || 'Not assigned'}`);
    console.log(`   Order: ${delivery.orderId}`);
    console.log(`   Farmer: ${delivery.order.farmer?.name || 'Unknown'}`);
    console.log(`   Buyer: ${delivery.order.buyer?.name || 'Unknown'}`);
    console.log(`   Current locationSharingEnabled: ${delivery.locationSharingEnabled}`);

    // Check if delivery is active
    const activeStatuses = ['TRANSPORTER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];
    if (!activeStatuses.includes(delivery.status)) {
      console.log(`⚠️  Delivery status ${delivery.status} is not active for location sharing`);
      return false;
    }

    // Check if transporter is assigned
    if (!delivery.transporterId) {
      console.log(`⚠️  No transporter assigned to delivery ${deliveryId}`);
      return false;
    }

    // Enable location sharing if not already enabled
    if (!delivery.locationSharingEnabled) {
      const updatedDelivery = await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          locationSharingEnabled: true,
          locationSharingStarted: new Date()
        }
      });

      console.log(`✅ Location sharing ENABLED for delivery ${deliveryId}`);
      console.log(`📍 Started at: ${updatedDelivery.locationSharingStarted}`);
      return true;
    } else {
      console.log(`ℹ️  Location sharing already enabled for delivery ${deliveryId}`);
      return true;
    }

  } catch (error) {
    console.error(`❌ Error starting location sharing for delivery ${deliveryId}:`, error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Allow command line usage
const deliveryId = process.argv[2];
if (deliveryId) {
  startLocationSharingForDelivery(deliveryId);
} else {
  console.log('Usage: node startLocationSharingForDelivery.js <delivery-id>');
  console.log('Example: node startLocationSharingForDelivery.js 6998317f084e3cae4de55ae0');
}
