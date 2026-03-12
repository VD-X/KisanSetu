const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugWebSocketRooms() {
  try {
    console.log('=== WebSocket Rooms Debug ===\n');
    
    // Get the specific delivery we're tracking
    const delivery = await prisma.delivery.findUnique({
      where: { id: '6998317f084e3cae4de55ae0' },
      include: {
        order: {
          select: {
            id: true,
            buyerId: true,
            farmerId: true
          }
        }
      }
    });
    
    if (!delivery) {
      console.log('Delivery not found');
      return;
    }
    
    console.log('Delivery Details:');
    console.log(`  Delivery ID: ${delivery.id}`);
    console.log(`  Status: ${delivery.status}`);
    console.log(`  Order ID: ${delivery.order.id}`);
    console.log(`  Buyer ID: ${delivery.order.buyerId}`);
    console.log(`  Farmer ID: ${delivery.order.farmerId}`);
    console.log(`  Transporter ID: ${delivery.transporterId}`);
    console.log(`  Location Sharing Enabled: ${delivery.locationSharingEnabled}`);
    
    console.log('\nExpected WebSocket Rooms:');
    console.log(`  - order-${delivery.order.id} (for buyer and farmer)`);
    console.log(`  - delivery-${delivery.id} (for tracking)`);
    
    console.log('\nRoom Joining Requirements:');
    console.log('  Buyer/Farmer should: socketService.joinOrderRoom(orderId)');
    console.log('  Transporter should: socketService.joinOrderRoom(orderId) + emitTransporterLocation()');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugWebSocketRooms();
