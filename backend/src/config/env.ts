import { config as dotenvConfig } from 'dotenv';
import { logger } from '../utils/logger';

// Load environment variables from .env file
dotenvConfig();

const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

export function validateEnv(): void {
  const missing: string[] = [];

  // Check if we have DATABASE_URL or individual DB variables
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasIndividualDbVars = !!(
    process.env.DB_HOST &&
    process.env.DB_PORT &&
    process.env.DB_NAME &&
    process.env.DB_USER
  );

  if (!hasDatabaseUrl && !hasIndividualDbVars) {
    logger.error('Missing database configuration: provide either DATABASE_URL or DB_HOST, DB_PORT, DB_NAME, DB_USER');
    process.exit(1);
  }

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar] === undefined) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Please check your .env file and ensure all required variables are set');
    process.exit(1);
  }

  logger.info('Environment variables validated successfully');
}

// Parse DATABASE_URL if provided (for Render deployment)
function parseDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432', 10),
      name: parsed.pathname.slice(1), // Remove leading slash
      user: parsed.username,
      password: parsed.password,
    };
  } catch (error) {
    logger.error('Failed to parse DATABASE_URL:', error);
    throw error;
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: process.env.DATABASE_URL
    ? parseDatabaseUrl(process.env.DATABASE_URL)
    : {
        host: process.env.DB_HOST!,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        name: process.env.DB_NAME!,
        user: process.env.DB_USER!,
        password: process.env.DB_PASSWORD!,
      },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  blockchain: {
    network: process.env.BLOCKCHAIN_NETWORK || 'polygon_mumbai',
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || '',
    walletPrivateKey: process.env.BLOCKCHAIN_WALLET_PRIVATE_KEY || '',
    contractAddress: process.env.SMART_CONTRACT_ADDRESS || '',
  },
  rateLimit: {
    freeTier: parseInt(process.env.RATE_LIMIT_FREE_TIER || '100', 10),
    premiumTier: parseInt(process.env.RATE_LIMIT_PREMIUM_TIER || '1000', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};
