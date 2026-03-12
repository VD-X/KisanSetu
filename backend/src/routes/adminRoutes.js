const express = require('express');
const router = express.Router();
const { getDashboardStats, getTransporters, verifyTransporter, createCrop, getUsers, updateUserStatus, getCrops, updateCrop } = require('../controllers/adminController');
const { verifyJWT } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Check Auth & Role
router.use(verifyJWT);
router.use(adminMiddleware);

// Dashboard
router.get('/stats', getDashboardStats);

// User Management (Farmers, Buyers)
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);

// Transporters
router.get('/transporters', getTransporters);
router.post('/transporters/:id/verify', verifyTransporter);

// Crops
router.get('/crops', getCrops);
router.post('/crops', createCrop);
router.put('/crops/:id', updateCrop);

// Market Prices
const { getMarketPrices, updateMarketPrice, createMarketPrice, refreshPrices } = require('../controllers/adminController');
router.get('/prices', getMarketPrices);
router.post('/prices', createMarketPrice);
router.put('/prices/:id', updateMarketPrice);
router.post('/prices/refresh', refreshPrices);

// Listings Moderation
const { getListings, updateListingStatus, getOrders, cancelOrder, reassignTransporter } = require('../controllers/adminController');
router.get('/listings', getListings);
router.put('/listings/:id/status', updateListingStatus);

// Order Management
router.get('/orders', getOrders);
router.post('/orders/:id/cancel', cancelOrder);
router.post('/orders/:id/reassign', reassignTransporter);

// Earnings
const { getEarnings, getAnalytics } = require('../controllers/adminController');
router.get('/earnings', getEarnings);
router.get('/analytics', getAnalytics);

// System Settings
const { getSettings, updateSettings } = require('../controllers/adminController');
router.get('/settings', getSettings);
router.post('/settings', updateSettings);

// Audit Logs
const { getAuditLogs } = require('../controllers/adminController');
router.get('/logs', getAuditLogs);

module.exports = router;
