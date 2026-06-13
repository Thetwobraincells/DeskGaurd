const http = require('http');
const app = require('./app');
const config = require('./config/env');
const prisma = require('./config/db');
const redis = require('./config/redis');
const { initSocket } = require('./websocket/socket');
const { initCronSweeper } = require('./cron/sweeper.cron');

const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

async function startServer() {
  try {
    console.log('Starting DeskGuard Backend Server...');

    // 1. Verify Prisma PostgreSQL Connection
    console.log('Testing PostgreSQL database connection...');
    await prisma.$connect();
    console.log('PostgreSQL database connection established successfully.');

    // 2. Connect to Redis Cache
    console.log('Connecting to Redis caching layer...');
    await redis.connectRedis();

    // 3. Initialize Cron Sweeper Sweeper
    initCronSweeper();

    // 4. Start HTTP Server
    server.listen(config.port, () => {
      console.log(`===================================================`);
      console.log(`  DeskGuard Server listening on port: ${config.port}`);
      console.log(`  Environment: ${config.env}`);
      console.log(`  CORS Allowed Origin: ${config.frontendUrl}`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('Critical failure starting DeskGuard server:', error);
    process.exit(1);
  }
}

// Graceful Shutdown Handler
const shutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('HTTP Server closed.');
    
    try {
      // Disconnect database client
      await prisma.$disconnect();
      console.log('PostgreSQL client disconnected.');

      // Disconnect Redis cache
      await redis.client.disconnect();
      console.log('Redis client disconnected.');
      
      console.log('Graceful shutdown completed. Exiting process.');
      process.exit(0);
    } catch (err) {
      console.error('Error during graceful shutdown:', err);
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if not exited
  setTimeout(() => {
    console.error('Forcefully exiting DeskGuard server...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
