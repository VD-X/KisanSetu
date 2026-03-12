const fetch = require('node-fetch');

/**
 * Get route information from OSRM
 * @param {number} lat1 
 * @param {number} lng1 
 * @param {number} lat2 
 * @param {number} lng2 
 * @returns {Promise<{distance: number, duration: number}>} distance in km, duration in minutes
 */
async function getRoute(lat1, lng1, lat2, lng2) {
    try {
        const url = `http://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== 'Ok') {
            throw new Error('OSRM route calculation failed');
        }

        const route = data.routes[0];
        return {
            distance: (route.distance / 1000).toFixed(2), // meters to km
            duration: Math.round(route.duration / 60) // seconds to minutes
        };
    } catch (error) {
        console.error('OSRM API Error:', error);
        return { distance: 0, duration: 0 };
    }
}

module.exports = { getRoute };
