import fs from 'fs';
import path from 'path';
import { DatabaseConnection } from './connection';
import { logger } from '../utils/logger';

const SCHEMA_VERSION = '001_initial_schema';

async function runMigration(): Promise<void> {
  const db = DatabaseConnection.getInstance();
  
  try {
    await db.testConnection();
    
    const pool = db.getPool();
    const client = await pool.connect();
    
    try {
      // Check if migration has already been applied
      // First create the table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const migrationCheck = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [SCHEMA_VERSION]
      );
      
      if (migrationCheck.rows.length > 0) {
        logger.info(`Migration ${SCHEMA_VERSION} already applied`);
        return;
      }
      
      // Read and execute schema file
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      logger.info('Applying database schema...');
      await client.query(schema);
      
      // Record migration
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [SCHEMA_VERSION]
      );
      
      logger.info('Database migration completed successfully');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Migration failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
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
    .catch((error) => {
      logger.error('Migration script failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      process.exit(1);
    });
}

export { runMigration };