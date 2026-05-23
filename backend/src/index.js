const app    = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const { testConnection } = require('./database/db');

let server;

const start = async () => {
  try {
    await testConnection();
    server = app.listen(config.port, () => {
      logger.info(`Ura Security API  ·  port ${config.port}  ·  [${config.env}]`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

const unexpectedError = (err) => {
  if (err?.code === 'EADDRINUSE') {
    logger.error(`Port ${config.port} is already in use.`);
    process.exit(1);
  }
  logger.error(err);
  exitHandler();
};

process.on('uncaughtException',  unexpectedError);
process.on('unhandledRejection', unexpectedError);
process.on('SIGTERM', () => { logger.info('SIGTERM received'); exitHandler(); });
process.on('SIGINT',  () => { logger.info('SIGINT received');  exitHandler(); });

start();
