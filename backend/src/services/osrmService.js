const fetch = require("node-fetch");

const OSRM_BASE_URL = process.env.OSRM_BASE_URL && process.env.OSRM_BASE_URL !== "http://localhost:5000"
    ? process.env.OSRM_BASE_URL
    : "http://router.project-osrm.org";

const getRoute = async (pickup, drop) => {
    try {
        const url = `${OSRM_BASE_URL}/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== 'Ok') {
            throw new Error(`OSRM error: ${data.code}`);
        }

        if (!data.routes || data.routes.length === 0) {
            throw new Error("No route found");
        }

        const route = data.routes[0];

        return {
            distance: route.distance / 1000, // km
            duration: route.duration / 60,   // minutes
            geometry: route.geometry
        };
    } catch (error) {
        throw new Error(`Failed to calculate route: ${error.message}`);
    }
};

module.exports = getRoute;
