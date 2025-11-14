import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL environment variable is not set. Database operations will fail.');
}

const client = process.env.DATABASE_URL ? postgres(process.env.DATABASE_URL) : (null as any);

export const db = client ? drizzle(client, { schema }) : (null as any);

export type Database = typeof db;
