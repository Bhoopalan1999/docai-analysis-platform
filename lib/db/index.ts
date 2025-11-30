import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, sessions, accounts, verifications, documents, conversations, messages, usage } from './schema';

// Note: In Next.js runtime, environment variables are automatically loaded.
// For standalone scripts, import '../scripts/load-env' at the top of the script file.

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL environment variable is not set. Database operations will fail.');
}

const schema = {
  users,
  sessions,
  accounts,
  verifications,
  documents,
  conversations,
  messages,
  usage,
};

// Configure postgres client with connection pooling to prevent connection exhaustion
// This is critical for Next.js serverless environments where connections can accumulate
// Using conservative settings for free-tier databases (Vercel Postgres typically allows 1-5 connections)
const getPostgresConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return {
    max: isDevelopment ? 3 : 5, // Lower in dev to prevent exhaustion, higher in prod
    idle_timeout: 10, // Close idle connections after 10 seconds
    max_lifetime: 60 * 15, // Close connections after 15 minutes
    connect_timeout: 10, // Connection timeout in seconds
    // Enable connection pooling for better performance
    transform: {
      undefined: null,
    },
    // Prevent connection leaks in serverless environments
    onnotice: () => {}, // Suppress notices
  };
};

// Use a global singleton pattern to ensure only one client instance
declare global {
  var __postgresClient: ReturnType<typeof postgres> | undefined;
}

const client = process.env.DATABASE_URL
  ? (globalThis.__postgresClient ??= postgres(process.env.DATABASE_URL, getPostgresConfig()))
  : (null as unknown as ReturnType<typeof postgres>);

export const db = client ? drizzle(client, { schema }) : (null as unknown as ReturnType<typeof drizzle>);

export type Database = typeof db;
