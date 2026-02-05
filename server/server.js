/**
 * NIRA System - Server Startup
 * Handles database connection and server initialization
 */

require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nira_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('✅ Connected to MongoDB');

    // Start server - listen on all network interfaces for mobile access
    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
      console.log(`🚀 NIRA System Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`📱 Mobile Access: http://YOUR_IP:${PORT}/api`);
      console.log(`\n💡 To find your IP address:`);
      console.log(`   Windows: ipconfig (look for IPv4 Address)`);
      console.log(`   Mac/Linux: ifconfig or ip addr`);
      console.log(`   Then update Flutter app API config with: http://YOUR_IP:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;
