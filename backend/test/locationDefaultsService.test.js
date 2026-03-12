const test = require('node:test');
const assert = require('node:assert/strict');

const {
    resolveFarmerListingLocation,
    resolvePickupLocation,
    resolveDropLocation,
    normalizeLocationInput
} = require('../src/services/locationDefaultsService');

test('resolveFarmerListingLocation prefers profile.address', async () => {
    const loc = resolveFarmerListingLocation({
        address: '  Farm Street, MyVillage  ',
        village: 'X',
        district: 'Y',
        state: 'Z'
    });
    assert.equal(loc, 'Farm Street, MyVillage');
});

test('resolveFarmerListingLocation falls back to village,district,state', async () => {
    const loc = resolveFarmerListingLocation({
        village: 'VillageA',
        district: 'DistrictB',
        state: 'StateC'
    });
    assert.equal(loc, 'VillageA, DistrictB, StateC');
});

test('normalizeLocationInput drops invalid coordinates and keeps address', async () => {
    const loc = normalizeLocationInput({ address: 'Test', lat: 200, lng: 10 });
    assert.deepEqual(loc, { address: 'Test' });
});

test('resolvePickupLocation avoids 0,0 and uses profile coordinates', async () => {
    const pickup = resolvePickupLocation({
        pickupInput: { address: '  ', lat: 0, lng: 0 },
        farmerProfile: { address: 'Farm Address', latitude: 12.34, longitude: 56.78 }
    });
    assert.equal(pickup.address, 'Farm Address');
    assert.equal(pickup.lat, 12.34);
    assert.equal(pickup.lng, 56.78);
});

test('resolveDropLocation prefers buyer profile address and coords', async () => {
    const drop = resolveDropLocation({
        dropInput: null,
        buyerProfile: { address: 'Buyer Address', latitude: 11, longitude: 22, city: 'C', state: 'S' },
        order: { deliveryAddress: 'Order Address', deliveryLatitude: 1, deliveryLongitude: 2 }
    });
    assert.equal(drop.address, 'Buyer Address');
    assert.equal(drop.lat, 11);
    assert.equal(drop.lng, 22);
});

test('resolveDropLocation falls back to order delivery coordinates', async () => {
    const drop = resolveDropLocation({
        dropInput: { address: 'Drop', lat: 0, lng: 0 },
        buyerProfile: { city: 'C', state: 'S' },
        order: { deliveryAddress: 'Order Address', deliveryLatitude: 10.1, deliveryLongitude: 20.2 }
    });
    assert.equal(drop.address, 'Drop');
    assert.equal(drop.lat, 10.1);
    assert.equal(drop.lng, 20.2);
});

