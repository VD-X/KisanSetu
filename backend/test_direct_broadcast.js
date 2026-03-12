const { PrismaClient } = require('@prisma/client');
const io = require('socket.io-client');
const prisma = new PrismaClient();

async function testDirectBroadcast() {
  try {
    console.log('=== Direct WebSocket Broadcast Test ===\n');
    
    const deliveryId = '6998317f084e3cae4de55ae0';
    const orderId = '6998314e084e3cae4de55adc';
    
    // Create socket connection
    const socket = io('http://localhost:5000', {
      transports: ['websocket']
    });
    
    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      
      // Join both rooms to see which one works
      socket.emit('join-order-room', orderId);
      console.log(`📢 Joined order room: order-${orderId}`);
      
      socket.emit('join-tracking-room', deliveryId);
      console.log(`📢 Joined tracking room: tracking-${deliveryId}`);
      
      // Listen for both event types
      socket.on('locationUpdate', (data) => {
        console.log('📍 Received locationUpdate event:', data);
      });
      
      socket.on('location-updated', (data) => {
        console.log('📍 Received location-updated event:', data);
      });
      
      // Test direct broadcast after 2 seconds
      setTimeout(() => {
        console.log('\n🧪 Testing direct broadcast...');
        
        // Get the io instance from the server and broadcast directly
        // This simulates what the controller should do
        const testLocation = { lat: 18.6516611, lng: 77.8337447 };
        
        // Emit location update event (what transporter dashboard sends)
        socket.emit('update-location', {
          deliveryId,
          lat: testLocation.lat,
          lng: testLocation.lng
        });
        
        console.log('📡 Sent update-location event');
        
        // Also test the other event name
        socket.emit('sendLocation', {
          deliveryId,
          lat: testLocation.lat,
          lng: testLocation.lng
        });
        
        console.log('📡 Sent sendLocation event');
      }, 2000);
      
      // Disconnect after 10 seconds
      setTimeout(() => {
        console.log('\n✅ Test completed');
        socket.disconnect();
      }, 10000);
    });
    
    socket.on('connect_error', (error) => {
      console.log('❌ Connection error:', error.message);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    setTimeout(() => {
      prisma.$disconnect();
    }, 15000);
  }
}

testDirectBroadcast();
