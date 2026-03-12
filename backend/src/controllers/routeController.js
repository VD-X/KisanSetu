const getRoute = require('../services/osrmService');

exports.calculateRoute = async (req, res) => {
    try {
        const { pickup, drop } = req.body;

        if (!pickup || !drop || !pickup.lat || !pickup.lng || !drop.lat || !drop.lng) {
            return res.status(400).json({ error: 'Valid Pickup and Drop coordinates are required' });
        }

        const routeData = await getRoute(pickup, drop);
        res.json(routeData);

    } catch (error) {
        console.error('Route Calculation Error:', error.message);
        res.status(500).json({ error: 'Failed to calculate route' });
    }
};
