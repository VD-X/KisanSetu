const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugLocationSharing() {
  try {
    console.log('=== Location Sharing Debug ===\n');
    
    // Check recent deliveries with location sharing info
    const deliveries = await prisma.delivery.findMany({
      where: {
        status: 'TRANSPORTER_ASSIGNED'
      },
      select: {
        id: true,
        status: true,
        transporterId: true,
        locationSharingEnabled: true,
        locationSharingStarted: true,
        locationSharingEnded: true,
        transporterLocation: true,
        lastLocationUpdate: true,
        order: {
          select: {
            id: true,
            buyerId: true,
            farmerId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    console.log(`Found ${deliveries.length} TRANSPORTER_ASSIGNED deliveries:`);
    
    deliveries.forEach(delivery => {
      console.log(`\nDelivery ${delivery.id.slice(0, 8)}...:`);
      console.log(`  Status: ${delivery.status}`);
      console.log(`  Transporter: ${delivery.transporterId?.slice(0, 8) || 'null'}...`);
      console.log(`  Location Sharing Enabled: ${delivery.locationSharingEnabled}`);
      console.log(`  Location Sharing Started: ${delivery.locationSharingStarted}`);
      console.log(`  Location Sharing Ended: ${delivery.locationSharingEnded}`);
      console.log(`  Last Location Update: ${delivery.lastLocationUpdate}`);
      console.log(`  Transporter Location: ${delivery.transporterLocation ? 'YES' : 'NO'}`);
      console.log(`  Order ID: ${delivery.order.id}`);
      console.log(`  Buyer ID: ${delivery.order.buyerId?.slice(0, 8) || 'null'}...`);
      console.log(`  Farmer ID: ${delivery.order.farmerId?.slice(0, 8) || 'null'}...`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugLocationSharing();
