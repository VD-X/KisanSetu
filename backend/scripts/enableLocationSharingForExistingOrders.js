const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function enableLocationSharingForExistingOrders() {
  console.log('🔧 Enabling location sharing for existing active orders...\n');
  
  try {
    // Find all active deliveries with assigned transporters
    const activeDeliveries = await prisma.delivery.findMany({
      where: {
        status: {
          in: ['TRANSPORTER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']
        },
        transporterId: {
          not: null
        }
      },
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

    console.log(`📊 Found ${activeDeliveries.length} active deliveries\n`);

    let updatedCount = 0;
    for (const delivery of activeDeliveries) {
      console.log(`🚚 Processing Delivery: ${delivery.id}`);
      console.log(`   Status: ${delivery.status}`);
      console.log(`   Transporter: ${delivery.transporter?.name || 'Unknown'}`);
      console.log(`   Order: ${delivery.orderId}`);
      console.log(`   Farmer: ${delivery.order.farmer?.name || 'Unknown'}`);
      console.log(`   Buyer: ${delivery.order.buyer?.name || 'Unknown'}`);
      console.log(`   Current locationSharingEnabled: ${delivery.locationSharingEnabled}`);

      // Only update if location sharing is not already enabled
      if (!delivery.locationSharingEnabled) {
        try {
          const updatedDelivery = await prisma.delivery.update({
            where: { id: delivery.id },
            data: {
              locationSharingEnabled: true,
              locationSharingStarted: new Date()
            }
          });

          console.log(`   ✅ Location sharing ENABLED for delivery ${delivery.id}`);
          console.log(`   📍 Started at: ${updatedDelivery.locationSharingStarted}`);
          updatedCount++;
        } catch (updateError) {
          console.log(`   ⚠️  Could not update delivery ${delivery.id}: ${updateError.message}`);
        }
      } else {
        console.log(`   ℹ️  Location sharing already enabled for delivery ${delivery.id}`);
      }
      console.log('');
    }

    console.log(`🎉 Successfully enabled location sharing for ${updatedCount} out of ${activeDeliveries.length} active deliveries!`);

    // Verify the updates
    const enabledDeliveries = await prisma.delivery.count({
      where: {
        status: {
          in: ['TRANSPORTER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']
        },
        transporterId: {
          not: null
        },
        locationSharingEnabled: true
      }
    });

    console.log(`📈 Total active deliveries with location sharing enabled: ${enabledDeliveries}`);

  } catch (error) {
    console.error('❌ Error enabling location sharing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
enableLocationSharingForExistingOrders();
