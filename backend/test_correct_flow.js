const io = require('socket.io-client');

async function testCorrectFlow() {
  console.log('=== Testing Correct Location Flow ===\n');
  
  const deliveryId = '6998317f084e3cae4de55ae0';
  const orderId = '6998314e084e3cae4de55adc';
  
  const socket = io('http://localhost:5000', {
    transports: ['websocket']
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket');
    
    // Join order room (what LiveTracking page does)
    socket.emit('join-order-room', orderId);
    console.log(`📢 Joined order room: order-${orderId}`);
    
    // Listen for location updates
    socket.on('locationUpdate', (data) => {
      console.log('🎉 SUCCESS! Received locationUpdate event:', data);
      console.log(`   Lat: ${data.lat}, Lng: ${data.lng}`);
      console.log(`   Delivery ID: ${data.deliveryId}`);
      console.log(`   Timestamp: ${data.timestamp}`);
    });
    
    // Send location update after 2 seconds (what transporter does)
    setTimeout(() => {
      console.log('\n🧪 Sending sendLocation event...');
      socket.emit('sendLocation', {
        deliveryId,
        lat: 18.6516611,
        lng: 77.8337447
      });
      console.log('📡 Sent sendLocation event');
    }, 2000);
    
    // Disconnect after 5 seconds
    setTimeout(() => {
      console.log('\n✅ Test completed');
      socket.disconnect();
    }, 5000);
  });
  
  socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message);
  });
}

testCorrectFlow();
