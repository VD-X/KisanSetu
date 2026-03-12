const { PrismaClient } = require('@prisma/client');
const io = require('socket.io-client');
const prisma = new PrismaClient();

async function testFullLocationFlow() {
  try {
    console.log('=== Full Location Sharing Flow Test ===\n');
    
    const deliveryId = '6998317f084e3cae4de55ae0';
    const orderId = '6998314e084e3cae4de55adc';
    
    // 1. Check current delivery state
    console.log('1. Current Delivery State:');
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        status: true,
        locationSharingEnabled: true,
        locationSharingStarted: true,
        transporterLocation: true,
        lastLocationUpdate: true,
        order: { select: { id: true, buyerId: true, farmerId: true } }
      }
    });
    
    if (!delivery) {
      console.log('❌ Delivery not found');
      return;
    }
    
    console.log(`   Status: ${delivery.status}`);
    console.log(`   Location Sharing: ${delivery.locationSharingEnabled}`);
    console.log(`   Transporter Location: ${delivery.transporterLocation ? 'YES' : 'NO'}`);
    console.log(`   Last Update: ${delivery.lastLocationUpdate}`);
    
    // 2. Simulate WebSocket connection as buyer
    console.log('\n2. Testing WebSocket connection as buyer...');
    const socket = io('http://localhost:5000', {
      transports: ['websocket'],
      auth: {
        token: 'mock-buyer-token'
      }
    });
    
    socket.on('connect', () => {
      console.log('   ✅ Connected to WebSocket');
      
      // Join order room as buyer
      socket.emit('join-order-room', orderId);
      console.log(`   📢 Joined order room: order-${orderId}`);
      
      // Listen for location updates
      socket.on('locationUpdate', (data) => {
        console.log('   📍 Location Update Received:', data);
        console.log(`      Lat: ${data.lat}, Lng: ${data.lng}`);
        console.log(`      Delivery ID: ${data.deliveryId}`);
        console.log(`      Timestamp: ${data.timestamp}`);
      });
      
      // Test location update after 2 seconds
      setTimeout(() => {
        console.log('\n3. Simulating location update...');
        // This would normally come from transporter dashboard
        const testLocation = { lat: 18.6516611, lng: 77.8337447 };
        
        // Direct database update to bypass auth for testing
        prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            transporterLocation: testLocation,
            lastLocationUpdate: new Date()
          }
        }).then(() => {
          console.log('   ✅ Location updated in database');
          
          // Manually emit location update for testing
          socket.emit('sendLocation', {
            deliveryId,
            lat: testLocation.lat,
            lng: testLocation.lng
          });
          console.log('   📡 Sent location update via WebSocket');
        });
      }, 2000);
      
      // Disconnect after 10 seconds
      setTimeout(() => {
        console.log('\n4. Test completed - disconnecting...');
        socket.disconnect();
      }, 10000);
    });
    
    socket.on('connect_error', (error) => {
      console.log('   ❌ WebSocket connection error:', error.message);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    setTimeout(() => {
      prisma.$disconnect();
    }, 15000);
  }
}

testFullLocationFlow();
