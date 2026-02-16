/**
 * server.js (UPDATED)
 * 
 * Main Express server with new architecture.
 * Uses container for dependency injection.
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import container (initializes all services and repositories)
const container = require('./container');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const systemAdminRoutes = require('./routes/system_admin');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Starting Hikvision EMS Server...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ========================================
// HEALTH CHECK
// ========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    redis: container.getRedisClient().isAvailable() ? 'connected' : 'disabled'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Hikvision EMS API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      admin: '/api/admin',
      attendance: '/api/attendance',
      leave: '/api/leave',
      'system-admin': '/api/system-admin'
    }
  });
});

// ========================================
// API ROUTES
// ========================================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/system-admin', systemAdminRoutes);

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} does not exist`,
    availableRoutes: [
      '/api/health',
      '/api/auth',
      '/api/admin',
      '/api/attendance',
      '/api/leave',
      '/api/system-admin'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  });
});

// ========================================
// SERVER STARTUP
// ========================================
const server = app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Hikvision EMS Server Started Successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔥 Firebase: Connected`);
  console.log(`💾 Redis: ${container.getRedisClient().isAvailable() ? 'Connected' : 'Disabled (In-Memory Mode)'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ Server is ready to accept requests!');
  console.log(`\n📖 API Documentation: http://localhost:${PORT}/\n`);
});

// ========================================
// GRACEFUL SHUTDOWN
// ========================================
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');

  try {
    // Close server
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    // Disconnect Redis
    await container.getRedisClient().disconnect();
    console.log('✅ Redis disconnected');
  } catch (error) {
    console.error('⚠️  Error during shutdown:', error);
  }

  console.log('👋 Server stopped');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ UNCAUGHT EXCEPTION');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error(error);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ UNHANDLED PROMISE REJECTION');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(1);
});

module.exports = app;
