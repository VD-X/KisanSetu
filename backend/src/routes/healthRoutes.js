// Health check endpoint for debugging
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const admin = require('../config/firebaseAdmin');

const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'OK', 
      message: 'Server is running',
      database: 'Connected',
      firebaseReady: admin.isReady(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database check failed',
      database: 'Disconnected',
      firebaseReady: admin.isReady(),
      error: error.message 
    });
  }
});

module.exports = router;
