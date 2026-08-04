const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const mongoose = require('mongoose');

let httpServer;
let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  try {
    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close(() => resolve());
      });
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  } catch (error) {
    console.error(`Error during ${signal} shutdown:`, error.message);
  } finally {
    if (signal === 'SIGUSR2') {
      // Hand control back to nodemon after cleanup.
      process.kill(process.pid, 'SIGUSR2');
      return;
    }
    process.exit(0);
  }
};

const startServer = async () => {
  await connectDB();

  httpServer = app.listen(env.port, () => {
    console.log(`NotWhat API listening on port ${env.port}`);
  });

  httpServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${env.port} is already in use. Stop the other backend instance and retry.`);
      process.exit(1);
    }

    console.error('HTTP server failed:', error.message);
    process.exit(1);
  });
};

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('SIGUSR2', () => {
  shutdown('SIGUSR2');
});

startServer().catch((error) => {
  console.error('Failed to start NotWhat API:', error.message);
  process.exit(1);
});
