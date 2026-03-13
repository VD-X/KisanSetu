const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const app = express();
const { initScheduler } = require('./utils/scheduler');

// Start Scheduler
initScheduler();

// Initialize Firebase Admin
require('./config/firebaseAdmin');

// Middleware
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Global Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    const safeHeaders = { ...req.headers };
    if (safeHeaders.authorization) safeHeaders.authorization = 'Bearer [REDACTED]';
    if (safeHeaders.cookie) safeHeaders.cookie = '[REDACTED]';
    console.log('Headers:', safeHeaders);
    if (req.body && Object.keys(req.body).length > 0) {
        const body = req.body || {};
        const safeBody = { ...body };
        for (const key of Object.keys(safeBody)) {
            const lowered = key.toLowerCase();
            if (
                lowered.includes('password') ||
                lowered.includes('token') ||
                lowered.includes('secret') ||
                lowered.includes('apikey') ||
                lowered.includes('api_key')
            ) {
                safeBody[key] = '[REDACTED]';
            }
        }
        if (Array.isArray(safeBody.images)) {
            safeBody.images = safeBody.images.map(i => (typeof i === 'string' ? `image(${i.length} chars)` : 'image'));
        }
        console.log('Body:', JSON.stringify(safeBody, null, 2));
    }
    next();
});

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to KisanSetu' });
});

app.get('/api', (req, res) => {
    res.json({ message: 'KisanSetu API is running correctly' });
});

app.get('/api/health', async (req, res) => {
    const admin = require('./config/firebaseAdmin');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
        await prisma.user.count();
        res.json({ 
            status: 'OK', 
            version: 'v3',
            message: 'Server is running',
            database: 'Connected',
            firebaseReady: admin.isReady(),
            firebaseError: admin.getError(),
            firebaseKeyStatus: admin.getDiagnostic(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            version: 'v3',
            message: 'Database check failed',
            database: 'Disconnected',
            firebaseReady: admin.isReady(),
            firebaseError: admin.getError(),
            firebaseKeyStatus: admin.getDiagnostic(),
            error: error.message 
        });
    }
});

// Auth Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Notification Routes
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

// Negotiation Routes
const negotiationRoutes = require('./routes/negotiationRoutes');
app.use('/api/negotiations', negotiationRoutes);



// Listing Routes
const listingRoutes = require('./routes/listingRoutes');
app.use('/api/listings', listingRoutes);

// Cart Routes
const cartRoutes = require('./routes/cartRoutes');
app.use('/api/cart', cartRoutes);

// Order Routes
const orderRoutes = require('./routes/orderRoutes');
app.use('/api/orders', orderRoutes);

// Delivery Deal Routes
const deliveryDealRoutes = require('./routes/deliveryDealRoutes');
app.use('/api/delivery-deals', deliveryDealRoutes);



// Earnings Routes
const earningRoutes = require('./routes/earningRoutes');
app.use('/api/earnings', earningRoutes);

// AI Routes
const aiRoutes = require('./routes/aiRoutes');
app.use('/api/ai', aiRoutes);

// Admin Routes
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

// Grading Routes
const gradingRoute = require('./routes/grading');
app.use('/api', gradingRoute);

// Market Price Routes
const marketPriceRoutes = require('./routes/marketPriceRoutes');
app.use('/api/market-prices', marketPriceRoutes);

// Location Routes
const locationRoutes = require('./routes/locationRoutes');
app.use('/api/location', locationRoutes);

// Route Calculation Routes (OSRM)
const routeRoutes = require('./routes/routeRoutes');
app.use('/api/route', routeRoutes);


// Wallet Routes
const walletRoutes = require('./routes/walletRoutes');
app.use('/api/wallet', walletRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
    const status = err?.status || err?.statusCode;
    if (status === 413 || err?.type === 'entity.too.large' || err?.name === 'PayloadTooLargeError') {
        return res.status(413).json({
            error: 'Images are too large. Please upload fewer/smaller photos.'
        });
    }
    if (status === 400 || err?.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid request body.' });
    }
    console.error(err.stack || err);
    res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
