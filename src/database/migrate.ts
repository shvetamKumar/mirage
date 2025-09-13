import fs from 'fs';
import path from 'path';
import { DatabaseConnection } from './connection';
import { logger } from '../utils/logger';

const MIGRATIONS = [
  { version: '001_initial_schema', file: 'schema.sql' },
  { version: '002_user_authentication', file: 'user_schema.sql' },
  { version: '003_add_user_id_to_endpoints', file: 'add_user_id_migration.sql' },
];

async function runMigration(): Promise<void> {
  const db = DatabaseConnection.getInstance();

  try {
    await db.testConnection();

    const pool = db.getPool();
    const client = await pool.connect();

    try {
      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Run all migrations in order
      for (const migration of MIGRATIONS) {
        const migrationCheck = await client.query(
          'SELECT version FROM schema_migrations WHERE version = $1',
          [migration.version]
        );

        if (migrationCheck.rows.length > 0) {
          logger.info(`Migration ${migration.version} already applied`);
          continue;
        }

        // Read and execute migration file
        const migrationPath = path.join(__dirname, migration.file);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        logger.info(`Applying migration ${migration.version}...`);
        await client.query(migrationSQL);

        // Record migration
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [
          migration.version,
        ]);

        logger.info(`Migration ${migration.version} completed successfully`);
      }

      logger.info('All database migrations completed successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Migration failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Migration script failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    });
}

export { runMigration };
