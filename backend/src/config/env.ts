import { config as dotenvConfig } from 'dotenv';
import { logger } from '../utils/logger';

// Load environment variables from .env file
dotenvConfig();

const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

export function validateEnv(): void {
  const missing: string[] = [];

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

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
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
