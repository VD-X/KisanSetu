const io = require('socket.io-client');

async function testWorkingEvent() {
  console.log('=== Testing Working WebSocket Event ===\n');
  
  const deliveryId = '6998317f084e3cae4de55ae0';
  
  const socket = io('http://localhost:5000', {
    transports: ['websocket']
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket');
    
    // Join tracking room
    socket.emit('join-tracking-room', deliveryId);
    console.log(`📢 Joined tracking room: tracking-${deliveryId}`);
    
    // Listen for location updates
    socket.on('location-updated', (data) => {
      console.log('🎉 SUCCESS! Received location-updated event:', data);
      console.log(`   Lat: ${data.lat}, Lng: ${data.lng}`);
    });
    
    // Send location update after 2 seconds
    setTimeout(() => {
      console.log('\n🧪 Sending update-location event...');
      socket.emit('update-location', {
        deliveryId,
        lat: 18.6516611,
        lng: 77.8337447
      });
      console.log('📡 Sent update-location event');
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

testWorkingEvent();
