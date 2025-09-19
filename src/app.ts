import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { DatabaseConnection } from './database/connection';
import { MockEndpointService } from './services/mock-endpoint.service';
import { MockEndpointController } from './controllers/mock-endpoint.controller';
import { MockServingController } from './controllers/mock-serving.controller';
import { createRoutes } from './routes';
import { requestLogger, addResponseTime } from './middleware/request-logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { environmentGuard, securityHeaders, requestSizeLimit } from './middleware/security';
import { csrfProtection } from './middleware/csrf';
import { logger } from './utils/logger';
import { config } from './config';

export class App {
  private app: express.Application;
  private dbConnection: DatabaseConnection;

  constructor() {
    this.app = express();
    this.dbConnection = DatabaseConnection.getInstance();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin: config.cors.origin,
        credentials: config.cors.credentials,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      })
    );

    // Compression
    this.app.use(compression());

    // Request size limiting
    this.app.use(requestSizeLimit(config.mock.maxResponseSize));

    // Custom security headers
    this.app.use(securityHeaders);

    // Environment validation
    this.app.use(environmentGuard);

    // Request timing
    this.app.use(addResponseTime);

    // Logging
    this.app.use(requestLogger);

    // Body parsing
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // CSRF protection for state-changing operations
    this.app.use(csrfProtection);

    // Disable x-powered-by header
    this.app.disable('x-powered-by');
  }

  private setupRoutes(): void {
    // Serve static files
    this.app.use(express.static('public'));

    // Initialize services and controllers
    const pool = this.dbConnection.getPool();
    const mockEndpointService = new MockEndpointService(pool);
    const mockEndpointController = new MockEndpointController(mockEndpointService);
    const mockServingController = new MockServingController(mockEndpointService);

    // Setup routes
    this.app.use('/', createRoutes(mockEndpointController, mockServingController));
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async initialize(): Promise<void> {
    try {
      // Test database connection
      await this.dbConnection.testConnection();
      logger.info('Database connection established successfully');

      // Run migrations if needed
      const { runMigration } = await import('./database/migrate');
      await runMigration();
      logger.info('Database migrations completed');
    } catch (error) {
      logger.error('Failed to initialize application', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async shutdown(): Promise<void> {
    try {
      await this.dbConnection.close();
      logger.info('Application shutdown completed');
    } catch (error) {
      logger.error('Error during application shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
