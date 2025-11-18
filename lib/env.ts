/**
 * Environment variable loader and validator
 *
 * This module handles loading environment variables for standalone scripts.
 * For Next.js runtime code, environment variables are automatically loaded by Next.js.
 *
 * Usage in standalone scripts:
 *   import './lib/env';
 *
 * This will load .env.local and .env files automatically.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Only load env vars if not already loaded (e.g., in Next.js runtime)
// Check if we're in a Node.js environment and not in Next.js
const isNextJsRuntime = typeof process !== 'undefined' && process.env.NEXT_RUNTIME;

if (!isNextJsRuntime) {
  // Load .env.local first (takes precedence), then .env as fallback
  config({ path: resolve(__dirname, '../.env.local') });
  config({ path: resolve(__dirname, '../.env') });
}

/**
 * Environment variable configuration
 * Use these typed getters instead of accessing process.env directly
 */
export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL,

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  // Anthropic Claude
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

  // Google Gemini
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,

  // Pinecone
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PINECONE_INDEX: process.env.PINECONE_INDEX,

  // AWS S3
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,

  // Better Auth
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,

  // Node environment
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

/**
 * Validate that required environment variables are set
 * @param required - Array of environment variable names to validate
 * @throws Error if any required variables are missing
 */
export function validateEnv(required: (keyof typeof env)[]): void {
  const missing: string[] = [];

  for (const key of required) {
    if (!env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` + 'Please check your .env.local or .env file.'
    );
  }
}
