const io = require('socket.io-client');

async function testBasicSocket() {
  console.log('=== Testing Basic Socket Functionality ===\n');
  
  const socket = io('http://localhost:5000', {
    transports: ['websocket']
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket');
    
    // Test basic room joining
    socket.emit('join-order-room', 'test-order-123');
    console.log('📢 Sent join-order-room event');
    
    // Listen for any events
    socket.onAny((eventName, ...args) => {
      console.log(`🔔 Received event: ${eventName}`, args);
    });
    
    // Test sending location
    setTimeout(() => {
      console.log('\n🧪 Sending sendLocation event...');
      socket.emit('sendLocation', {
        deliveryId: 'test-delivery-123',
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
  
  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from WebSocket');
  });
}

testBasicSocket();
