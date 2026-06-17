// Environment configuration
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'moltbook-dev-secret-change-in-production',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  masterKey: process.env.MASTER_KEY || 'moltbook-master-key-change-in-production',
  resendApiKey: process.env.RESEND_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
};
