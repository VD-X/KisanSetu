// Test if socket.js is being loaded properly
const { initSocket } = require('./src/socket');

console.log('Testing socket.js loading...');
console.log('initSocket function:', typeof initSocket);

// Try to call initSocket to see if there are any errors
try {
  const http = require('http');
  const server = http.createServer();
  const io = initSocket(server);
  console.log('✅ socket.js loaded successfully');
  console.log('io instance:', typeof io);
} catch (error) {
  console.error('❌ Error loading socket.js:', error.message);
  console.error('Stack:', error.stack);
}
