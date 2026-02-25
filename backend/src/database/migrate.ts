import { pool } from './pool';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  logger.info(`Found ${migrationFiles.length} migration files`);

  for (const file of migrationFiles) {
    try {
      logger.info(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      logger.info(`✓ Migration ${file} completed successfully`);
    } catch (error) {
      logger.error(`✗ Migration ${file} failed:`, error);
      throw error;
    }
  }

  logger.info('All migrations completed successfully');
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Database migration completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database migration failed:', error);
      process.exit(1);
    });
}

export { runMigrations };
