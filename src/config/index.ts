import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env['PORT'] || '3000', 10),
    host: process.env['HOST'] || '0.0.0.0',
    nodeEnv: process.env['NODE_ENV'] || 'development',
  },
  database: {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432', 10),
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'password',
    name: process.env['DB_NAME'] || 'mirage_dev',
    ssl: process.env['DB_SSL'] === 'true',
    poolMax: parseInt(process.env['DB_POOL_MAX'] || '20', 10),
    poolMin: parseInt(process.env['DB_POOL_MIN'] || '2', 10),
    idleTimeout: parseInt(process.env['DB_IDLE_TIMEOUT'] || '30000', 10),
    connectionTimeout: parseInt(process.env['DB_CONNECTION_TIMEOUT'] || '60000', 10),
  },
  logging: {
    level: process.env['LOG_LEVEL'] || 'info',
  },
  cors: {
    origin: process.env['CORS_ORIGIN'] || '*',
    credentials: process.env['CORS_CREDENTIALS'] === 'true',
  },
  rateLimit: {
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10), // 15 minutes
    max: parseInt(process.env['RATE_LIMIT_MAX'] || '100', 10), // limit each IP to 100 requests per windowMs
  },
  mock: {
    maxResponseDelay: parseInt(process.env['MAX_RESPONSE_DELAY_MS'] || '10000', 10), // 10 seconds
    maxResponseSize: parseInt(process.env['MAX_RESPONSE_SIZE_BYTES'] || '1048576', 10), // 1MB
  },
} as const;