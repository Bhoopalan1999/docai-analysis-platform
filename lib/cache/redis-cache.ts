import { Redis } from '@upstash/redis';

// Note: In Next.js runtime, environment variables are automatically loaded.
// For standalone scripts, import '../scripts/load-env' at the top of the script file.

if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
  console.warn('Upstash Redis credentials not configured. Caching will be disabled.');
}

// Initialize Redis client (singleton pattern)
let redisClient: Redis | null = null;

/**
 * Get or initialize the Redis client
 * @returns Redis client instance or null if not configured
 */
function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
  }

  return redisClient;
}

/**
 * Cache key prefixes
 */
const CACHE_PREFIXES = {
  embedding: 'emb:',
  query: 'query:',
  document: 'doc:',
  summary: 'summary:',
  entities: 'entities:',
  sentiment: 'sentiment:',
} as const;

/**
 * Default TTL (Time To Live) in seconds
 */
const DEFAULT_TTL = {
  embedding: 60 * 60 * 24 * 7, // 7 days
  query: 60 * 60, // 1 hour
  document: 60 * 60 * 24, // 1 day
  summary: 60 * 60 * 24, // 1 day
  entities: 60 * 60 * 24, // 1 day
  sentiment: 60 * 60 * 24, // 1 day
} as const;

/**
 * Generate cache key
 */
function getCacheKey(prefix: keyof typeof CACHE_PREFIXES, ...parts: (string | number)[]): string {
  return `${CACHE_PREFIXES[prefix]}${parts.join(':')}`;
}

/**
 * Get value from cache
 * @param key - Cache key
 * @returns Cached value or null
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const value = await client.get<T>(key);
    return value;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

/**
 * Set value in cache
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time to live in seconds (optional)
 * @returns True if successful
 */
export async function setCache(key: string, value: unknown, ttl?: number): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    if (ttl) {
      await client.setex(key, ttl, value);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (error) {
    console.error('Redis set error:', error);
    return false;
  }
}

/**
 * Delete value from cache
 * @param key - Cache key
 * @returns True if successful
 */
export async function deleteCache(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Redis delete error:', error);
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 * @param pattern - Pattern to match (e.g., 'emb:*')
 * @returns Number of keys deleted
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  if (!client) {
    return 0;
  }

  try {
    // Note: SCAN is more efficient for large datasets, but for simplicity we'll use KEYS
    // In production, consider using SCAN with cursor for better performance
    const keys = await client.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    await client.del(...keys);
    return keys.length;
  } catch (error) {
    console.error('Redis delete pattern error:', error);
    return 0;
  }
}

/**
 * Cache embedding
 * @param text - Text to cache embedding for
 * @param embedding - Embedding vector
 * @returns True if successful
 */
export async function cacheEmbedding(text: string, embedding: number[]): Promise<boolean> {
  const key = getCacheKey('embedding', text.substring(0, 100)); // Use first 100 chars as key
  return setCache(key, embedding, DEFAULT_TTL.embedding);
}

/**
 * Get cached embedding
 * @param text - Text to get embedding for
 * @returns Cached embedding or null
 */
export async function getCachedEmbedding(text: string): Promise<number[] | null> {
  const key = getCacheKey('embedding', text.substring(0, 100));
  return getCache<number[]>(key);
}

/**
 * Cache query result
 * @param query - Query string
 * @param documentIds - Document IDs
 * @param result - Query result
 * @returns True if successful
 */
export async function cacheQuery(query: string, documentIds: string[], result: unknown): Promise<boolean> {
  const key = getCacheKey('query', query.substring(0, 100), ...documentIds.sort());
  return setCache(key, result, DEFAULT_TTL.query);
}

/**
 * Get cached query result
 * @param query - Query string
 * @param documentIds - Document IDs
 * @returns Cached result or null
 */
export async function getCachedQuery(query: string, documentIds: string[]): Promise<unknown | null> {
  const key = getCacheKey('query', query.substring(0, 100), ...documentIds.sort());
  return getCache(key);
}

/**
 * Cache document analysis result
 * @param documentId - Document ID
 * @param type - Analysis type (summary, entities, sentiment)
 * @param result - Analysis result
 * @returns True if successful
 */
export async function cacheDocumentAnalysis(
  documentId: string,
  type: 'summary' | 'entities' | 'sentiment',
  result: unknown
): Promise<boolean> {
  const prefix = type as keyof typeof CACHE_PREFIXES;
  const key = getCacheKey(prefix, documentId);
  return setCache(key, result, DEFAULT_TTL[prefix]);
}

/**
 * Get cached document analysis result
 * @param documentId - Document ID
 * @param type - Analysis type
 * @returns Cached result or null
 */
export async function getCachedDocumentAnalysis(
  documentId: string,
  type: 'summary' | 'entities' | 'sentiment'
): Promise<unknown | null> {
  const prefix = type as keyof typeof CACHE_PREFIXES;
  const key = getCacheKey(prefix, documentId);
  return getCache(key);
}

/**
 * Invalidate document cache (delete all cached data for a document)
 * @param documentId - Document ID
 * @returns Number of keys deleted
 */
export async function invalidateDocumentCache(documentId: string): Promise<number> {
  const patterns = [
    getCacheKey('summary', documentId),
    getCacheKey('entities', documentId),
    getCacheKey('sentiment', documentId),
    getCacheKey('document', documentId),
  ];

  let deleted = 0;
  for (const pattern of patterns) {
    const result = await deleteCache(pattern);
    if (result) deleted++;
  }

  return deleted;
}

/**
 * Check if Redis is configured
 * @returns True if Redis is available
 */
export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN);
}
