// Environment configuration
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'moltbook-dev-secret-change-in-production',
  jwtPrivateKey: process.env.JWT_PRIVATE_KEY || '',
  jwtPublicKey: process.env.JWT_PUBLIC_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  masterKey: process.env.MASTER_KEY || 'moltbook-master-key-change-in-production',
  resendApiKey: process.env.RESEND_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
};
