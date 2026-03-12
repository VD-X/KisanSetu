const path = require('path');
const dotenv = require('dotenv');
// Load env vars before anything else
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const gradingRoute = require('./routes/grading');
const { initCronJobs } = require('./services/cronService');
dotenv.config(); // Fallback to default .env

const app = require('./app');
app.use('/api', gradingRoute);
const http = require('http');
// Import centralized socket initialization
const { initSocket, getIo } = require('./socket');
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO centralized
initSocket(server);

// Import models for database operations
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Note: Duplicate socket logic removed. All socket events are now handled in socket.js

const wishlistRoutes = require('./routes/wishlistRoutes');
app.use('/api/wishlist', wishlistRoutes);

// Make io accessible to routes via getIo() or app.set
// We need to wait for initSocket to complete, which is synchronous.
try {
  const io = getIo();
  app.set('io', io);
} catch (e) {
  console.error("Failed to set io on app:", e.message);
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server is ready`);
  
  // Initialize background jobs
  initCronJobs();
});

// Prevent server crashes
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
