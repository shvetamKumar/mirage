// Test setup file
import { config } from '../src/config';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Override database config for tests
process.env.DB_NAME = 'mirage_test';

// Suppress console.log in tests
const originalConsoleLog = console.log;
console.log = (...args: unknown[]): void => {
  if (process.env.VERBOSE_TESTS === 'true') {
    originalConsoleLog(...args);
  }
};

export { config };