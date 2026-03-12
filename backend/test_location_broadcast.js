const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function testLocationBroadcast() {
  try {
    console.log('=== Test Location Broadcast ===\n');
    
    const deliveryId = '6998317f084e3cae4de55ae0';
    const transporterId = '6994b877dec03793d05d536f';
    
    // Test location update via API
    const testLocation = {
      lat: 18.6516611,
      lng: 77.8337447
    };
    
    console.log('Testing location update...');
    console.log(`  Delivery ID: ${deliveryId}`);
    console.log(`  Transporter ID: ${transporterId}`);
    console.log(`  Test Location: ${testLocation.lat}, ${testLocation.lng}`);
    
    try {
      // Simulate API call to update location
      const response = await axios.put(`http://localhost:5000/api/delivery-deals/${deliveryId}/location`, testLocation, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token-for-${transporterId}`
        }
      });
      
      console.log('\n✅ API Response:', response.data);
    } catch (error) {
      console.log('\n❌ API Error:', error.response?.data || error.message);
    }
    
    // Check database after update
    console.log('\nChecking database after update...');
    const updatedDelivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        transporterLocation: true,
        lastLocationUpdate: true,
        locationSharingEnabled: true
      }
    });
    
    if (updatedDelivery) {
      console.log(`  Location in DB: ${updatedDelivery.transporterLocation ? 'YES' : 'NO'}`);
      console.log(`  Last Update: ${updatedDelivery.lastLocationUpdate}`);
      console.log(`  Sharing Enabled: ${updatedDelivery.locationSharingEnabled}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testLocationBroadcast();
