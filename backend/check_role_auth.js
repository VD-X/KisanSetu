const roleAuth = require('./src/middleware/roleAuth');

console.log('--- Role Auth Middleware Exports ---');
console.log('Keys:', Object.keys(roleAuth));
console.log('authenticate:', typeof roleAuth.authenticate);
console.log('requireTransporter:', typeof roleAuth.requireTransporter);
console.log('requireFarmerOrBuyer:', typeof roleAuth.requireFarmerOrBuyer);
console.log('requireBuyer:', typeof roleAuth.requireBuyer);
console.log('requireFarmer:', typeof roleAuth.requireFarmer);
