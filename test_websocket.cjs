const io = require('socket.io-client');

async function testWebSocket() {
  console.log('=== Testing WebSocket Connection ===\n');
  
  const socket = io('http://localhost:5000', {
    transports: ['websocket']
  });
  
  socket.on('connect', () => {
    console.log('✅ WebSocket connected successfully');
    console.log(`   Socket ID: ${socket.id}`);
    
    // Test room joining
    socket.emit('join-order-room', 'test-order-123');
    console.log('📢 Joined test order room');
    
    // Test location update
    socket.emit('sendLocation', {
      deliveryId: 'test-delivery-123',
      lat: 18.6516611,
      lng: 77.8337447
    });
    console.log('📡 Sent test location update');
    
    // Disconnect after 2 seconds
    setTimeout(() => {
      socket.disconnect();
      console.log('✅ Test completed successfully');
    }, 2000);
  });
  
  socket.on('connect_error', (error) => {
    console.log('❌ WebSocket connection error:', error.message);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 WebSocket disconnected');
  });
}

testWebSocket();
