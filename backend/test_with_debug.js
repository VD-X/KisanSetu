const io = require('socket.io-client');

async function testWithDebug() {
  console.log('=== Testing with Debug Logging ===\n');
  
  const socket = io('http://localhost:5000', {
    transports: ['websocket']
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket');
    
    // Test join-order-room with a simple order ID
    const testOrderId = '6998314e084e3cae4de55adc';
    socket.emit('join-order-room', testOrderId);
    console.log(`📢 Sent join-order-room for: ${testOrderId}`);
    
    // Listen for location updates
    socket.on('locationUpdate', (data) => {
      console.log('🎉 SUCCESS! Received locationUpdate:', data);
    });
    
    // Listen for all events to see what's happening
    socket.onAny((eventName, ...args) => {
      console.log(`🔔 Event received: ${eventName}`, args);
    });
    
    // Test sendLocation with the actual delivery ID
    setTimeout(() => {
      const testDeliveryId = '6998317f084e3cae4de55ae0';
      console.log(`\n🧪 Sending sendLocation for delivery: ${testDeliveryId}`);
      socket.emit('sendLocation', {
        deliveryId: testDeliveryId,
        lat: 18.6516611,
        lng: 77.8337447
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
  
  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from WebSocket');
  });
}

testWithDebug();
