const distanceService = require('./distanceService');

const safeTrim = (value) => (typeof value === 'string' ? value.trim() : '');

const resolveFarmerListingLocation = (farmerProfile) => {
    const address = safeTrim(farmerProfile?.address);
    if (address) return address;
    const parts = [farmerProfile?.village, farmerProfile?.district, farmerProfile?.state].map(safeTrim).filter(Boolean);
    return parts.length ? parts.join(', ') : '';
};

const resolveBuyerLocationString = (buyerProfile) => {
    const address = safeTrim(buyerProfile?.address);
    if (address) return address;
    const parts = [buyerProfile?.city, buyerProfile?.state].map(safeTrim).filter(Boolean);
    return parts.length ? parts.join(', ') : '';
};

const normalizeLocationInput = (value) => {
    if (!value || typeof value !== 'object') return null;
    const address = safeTrim(value.address);
    const lat = typeof value.lat === 'number' ? value.lat : (typeof value.latitude === 'number' ? value.latitude : undefined);
    const lng = typeof value.lng === 'number' ? value.lng : (typeof value.longitude === 'number' ? value.longitude : undefined);
    const out = {};
    if (address) out.address = address;
    if (distanceService.isValidCoordinate(lat, lng) && !(lat === 0 && lng === 0)) {
        out.lat = lat;
        out.lng = lng;
    }
    return Object.keys(out).length ? out : null;
};

const resolvePickupLocation = ({ pickupInput, farmerProfile }) => {
    const input = normalizeLocationInput(pickupInput) || {};
    const address = resolveFarmerListingLocation(farmerProfile);
    if (address) {
        input.address = address;
    }
    const lat = farmerProfile?.latitude;
    const lng = farmerProfile?.longitude;
    if (distanceService.isValidCoordinate(lat, lng) && !(lat === 0 && lng === 0)) {
        input.lat = lat;
        input.lng = lng;
    }
    return input;
};

const resolveDropLocation = ({ dropInput, buyerProfile, order }) => {
    const input = normalizeLocationInput(dropInput) || {};
    if (!input.address) {
        const address = resolveBuyerLocationString(buyerProfile) || safeTrim(order?.deliveryAddress);
        if (address) input.address = address;
    }
    if (input.lat === undefined && input.lng === undefined) {
        const lat = buyerProfile?.latitude ?? order?.deliveryLatitude;
        const lng = buyerProfile?.longitude ?? order?.deliveryLongitude;
        if (distanceService.isValidCoordinate(lat, lng) && !(lat === 0 && lng === 0)) {
            input.lat = lat;
            input.lng = lng;
        }
    }
    return input;
};

module.exports = {
    resolveFarmerListingLocation,
    resolvePickupLocation,
    resolveDropLocation,
    normalizeLocationInput
};
