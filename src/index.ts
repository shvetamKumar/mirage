import { App } from './app';
import { logger } from './utils/logger';
import { config } from './config';

async function startServer(): Promise<void> {
  try {
    // Create and initialize the application
    const app = new App();
    await app.initialize();

    const server = app.getApp().listen(config.server.port, config.server.host, () => {
      logger.info('Mirage Dummy Data Service started', {
        port: config.server.port,
        host: config.server.host,
        nodeEnv: config.server.nodeEnv,
        processId: process.pid,
      });

      logger.info('Available endpoints:', {
        management: `http://${config.server.host}:${config.server.port}/api/v1/mock-endpoints`,
        mock: `http://${config.server.host}:${config.server.port}/mock/*`,
        health: `http://${config.server.host}:${config.server.port}/health`,
        metrics: `http://${config.server.host}:${config.server.port}/metrics`,
        debug: `http://${config.server.host}:${config.server.port}/debug/mocks`,
      });
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await app.shutdown();
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Graceful shutdown timed out. Forcing shutdown...');
        process.exit(1);
      }, 30000);
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: promise.toString(),
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Start the server
startServer();
