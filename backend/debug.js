
const path = require('path');
const dotenv = require('dotenv');
console.log('1. Loading .env');
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('2. Requiring express');
const express = require('express');

console.log('3. Requiring cors');
const cors = require('cors');

console.log('4. Requiring Prisma');
const { PrismaClient } = require('@prisma/client');
try {
    const prisma = new PrismaClient();
    console.log('   Prisma client initialized');
} catch (e) {
    console.error('   Prisma client failed:', e);
}

console.log('5. Requiring scheduler');
try {
    const { initScheduler } = require('./src/utils/scheduler');
    console.log('   Scheduler loaded');
} catch (e) {
    console.error('   Scheduler failed:', e);
}

console.log('6. Requiring grading route');
try {
    const gradingRoute = require('./src/routes/grading');
    console.log('   Grading route loaded');
} catch (e) {
    console.error('   Grading route failed:', e);
}

console.log('7. Requiring auth routes');
try {
    const authRoutes = require('./src/routes/authRoutes');
    console.log('   Auth routes loaded');
} catch (e) {
    console.error('   Auth routes failed:', e);
}

console.log('8. Requiring AI routes');
try {
    const aiRoutes = require('./src/routes/aiRoutes');
    console.log('   AI routes loaded');
} catch (e) {
    console.error('   AI routes failed:', e);
}

console.log('9. Requiring app');
try {
    const app = require('./src/app');
    console.log('   App loaded');
} catch (e) {
    console.error('   App failed:', e);
}

console.log('10. Requiring socket');
try {
    const { initSocket } = require('./src/socket');
    console.log('   Socket loaded');
} catch (e) {
    console.error('   Socket failed:', e);
}

console.log('11. Starting server');
const http = require('http');
// const server = http.createServer(app); // App might be undefined if it failed
// server.listen(5002, () => {
//     console.log('Server started on 5002');
//     process.exit(0);
// });
