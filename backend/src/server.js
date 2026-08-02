const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');

const startServer = async () => {
  await connectDB();

  app.listen(env.port, () => {
    console.log(`NotWhat API listening on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start NotWhat API:', error.message);
  process.exit(1);
});
