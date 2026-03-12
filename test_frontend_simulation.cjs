const io = require('socket.io-client');

async function testFrontendSimulation() {
  console.log('=== Testing Frontend Simulation ===\n');
  
  // Simulate exactly what frontend does
  const socket = io('http://localhost:5000', {
    transports: ['websocket'],
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });
  
  socket.on('connect', () => {
    console.log('✅ Frontend simulation: Connected to WebSocket');
    console.log(`   Socket ID: ${socket.id}`);
    
    // Simulate joining order room (what LiveTracking does)
    const orderId = '6998314e084e3cae4de55adc';
    socket.emit('join-order-room', orderId);
    console.log(`📢 Frontend simulation: Joined order room: order-${orderId}`);
    
    // Listen for location updates (what buyer/farmer does)
    socket.on('locationUpdate', (data) => {
      console.log('🎉 Frontend simulation: Received locationUpdate:', data);
    });
    
    // Simulate transporter sending location (what TransporterDashboard does)
    setTimeout(() => {
      const deliveryId = '6998317f084e3cae4de55ae0';
      socket.emit('sendLocation', {
        deliveryId,
        lat: 18.6516611,
        lng: 77.8337447
      });
      console.log('📡 Frontend simulation: Sent location update');
    }, 2000);
    
    // Disconnect after 5 seconds
    setTimeout(() => {
      socket.disconnect();
      console.log('✅ Frontend simulation: Test completed');
    }, 5000);
  });
  
  socket.on('connect_error', (error) => {
    console.log('❌ Frontend simulation: Connection error:', error.message);
    console.log('   Details:', error.description);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Frontend simulation: Disconnected - Reason: ${reason}`);
  });
  
  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Frontend simulation: Reconnected after ${attemptNumber} attempts`);
  });
}

testFrontendSimulation();
