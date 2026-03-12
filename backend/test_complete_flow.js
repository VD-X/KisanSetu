const io = require('socket.io-client');

async function testCompleteFlow() {
  console.log('=== Testing Complete Location Sharing Flow ===\n');
  
  const deliveryId = '6998317f084e3cae4de55ae0';
  const orderId = '6998314e084e3cae4de55adc';
  
  // Create two sockets - one for buyer/farmer, one for transporter
  const buyerSocket = io('http://localhost:5000', {
    transports: ['websocket']
  });
  
  const transporterSocket = io('http://localhost:5000', {
    transports: ['websocket']
  });
  
  let buyerConnected = false;
  let transporterConnected = false;
  
  // Buyer/Farmer socket setup
  buyerSocket.on('connect', () => {
    console.log('✅ Buyer/Farmer connected to WebSocket');
    buyerConnected = true;
    
    // Join order room (what LiveTracking page does)
    buyerSocket.emit('join-order-room', orderId);
    console.log(`📢 Buyer joined order room: order-${orderId}`);
    
    // Listen for location updates
    buyerSocket.on('locationUpdate', (data) => {
      console.log('🎉 SUCCESS! Buyer received locationUpdate:', data);
      console.log(`   Lat: ${data.lat}, Lng: ${data.lng}`);
      console.log(`   Delivery ID: ${data.deliveryId}`);
      console.log(`   Timestamp: ${data.timestamp}`);
    });
  });
  
  // Transporter socket setup
  transporterSocket.on('connect', () => {
    console.log('✅ Transporter connected to WebSocket');
    transporterConnected = true;
    
    // Send location updates (what TransporterDashboard does)
    setTimeout(() => {
      console.log('\n🧪 Transporter sending location updates...');
      transporterSocket.emit('sendLocation', {
        deliveryId,
        lat: 18.6516611,
        lng: 77.8337447
      });
      console.log('📡 Transporter sent sendLocation event');
    }, 2000);
  });
  
  // Wait for both to connect and test
  setTimeout(() => {
    if (buyerConnected && transporterConnected) {
      console.log('\n✅ Both sockets connected, starting test...');
    } else {
      console.log('\n❌ Not all sockets connected');
    }
  }, 1000);
  
  // Disconnect after 10 seconds
  setTimeout(() => {
    console.log('\n✅ Test completed');
    buyerSocket.disconnect();
    transporterSocket.disconnect();
  }, 10000);
}

testCompleteFlow();
