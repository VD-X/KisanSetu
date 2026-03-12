const io = require('socket.io-client');

async function testRoomJoin() {
  console.log('=== Testing Room Join ===\n');
  
  const socket = io('http://localhost:5000', {
    transports: ['websocket']
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket');
    
    // Test join-order-room
    const testOrderId = 'test-order-123';
    socket.emit('join-order-room', testOrderId);
    console.log(`📢 Sent join-order-room for: ${testOrderId}`);
    
    // Test sendLocation immediately
    setTimeout(() => {
      socket.emit('sendLocation', {
        deliveryId: 'test-delivery-123',
        lat: 18.6516611,
        lng: 77.8337447
      });
      console.log('📡 Sent sendLocation event');
    }, 1000);
    
    // Disconnect after 3 seconds
    setTimeout(() => {
      console.log('\n✅ Test completed');
      socket.disconnect();
    }, 3000);
  });
  
  socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message);
  });
}

testRoomJoin();
