const deliveryDealController = require('./src/controllers/deliveryDealController');

console.log('--- Delivery Deal Controller Exports ---');
console.log('Keys:', Object.keys(deliveryDealController));
console.log('getAvailableDeals:', typeof deliveryDealController.getAvailableDeals);
console.log('getMyDeliveries:', typeof deliveryDealController.getMyDeliveries);
console.log('createDeliveryDeal:', typeof deliveryDealController.createDeliveryDeal);
console.log('payForDeliveryDeal:', typeof deliveryDealController.payForDeliveryDeal);
