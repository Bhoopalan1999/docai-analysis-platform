import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getTierLimits, SubscriptionTier } from '@/lib/subscription/tiers';

/**
 * Quota check result
 */
export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
  remaining: number;
}

/**
 * Check document count quota
 * @param userId - User ID
 * @param tier - Subscription tier
 * @returns Quota check result
 */
export async function checkDocumentQuota(userId: string, tier: SubscriptionTier = 'free'): Promise<QuotaCheckResult> {
  const limits = getTierLimits(tier);
  const maxDocuments = limits.maxDocuments;

  // Unlimited
  if (maxDocuments === -1) {
    return {
      allowed: true,
      current: 0,
      limit: -1,
      remaining: -1,
    };
  }

  try {
    const result = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(documents)
      .where(eq(documents.userId, userId));

    const current = result[0]?.count ? Number(result[0].count) : 0;
    const remaining = Math.max(0, maxDocuments - current);
    const allowed = current < maxDocuments;

    return {
      allowed,
      current,
      limit: maxDocuments,
      remaining,
      reason: !allowed ? `Document limit reached (${current}/${maxDocuments})` : undefined,
    };
  } catch (error) {
    console.error('Document quota check error:', error);
    // Fail open - allow the request
    return {
      allowed: true,
      current: 0,
      limit: maxDocuments,
      remaining: maxDocuments,
    };
  }
}

/**
 * Check storage quota
 * @param userId - User ID
 * @param tier - Subscription tier
 * @returns Quota check result (in bytes)
 */
export async function checkStorageQuota(userId: string, tier: SubscriptionTier = 'free'): Promise<QuotaCheckResult> {
  const limits = getTierLimits(tier);
  const maxStorage = limits.maxStorageBytes;

  // Unlimited
  if (maxStorage === -1) {
    return {
      allowed: true,
      current: 0,
      limit: -1,
      remaining: -1,
    };
  }

  try {
    const result = await db
      .select({
        totalSize: sql<number>`COALESCE(SUM(${documents.fileSize}), 0)`,
      })
      .from(documents)
      .where(eq(documents.userId, userId));

    const current = result[0]?.totalSize ? Number(result[0].totalSize) : 0;
    const remaining = Math.max(0, maxStorage - current);
    const allowed = current < maxStorage;

    return {
      allowed,
      current,
      limit: maxStorage,
      remaining,
      reason: !allowed
        ? `Storage limit reached (${(current / (1024 * 1024)).toFixed(2)}MB / ${(maxStorage / (1024 * 1024)).toFixed(
            2
          )}MB)`
        : undefined,
    };
  } catch (error) {
    console.error('Storage quota check error:', error);
    // Fail open - allow the request
    return {
      allowed: true,
      current: 0,
      limit: maxStorage,
      remaining: maxStorage,
    };
  }
}

/**
 * Check if file size is within tier limits
 * @param fileSize - File size in bytes
 * @param tier - Subscription tier
 * @returns Quota check result
 */
export function checkFileSizeQuota(fileSize: number, tier: SubscriptionTier = 'free'): QuotaCheckResult {
  const limits = getTierLimits(tier);
  const maxFileSize = limits.maxDocumentSize;

  // Unlimited
  if (maxFileSize === -1) {
    return {
      allowed: true,
      current: fileSize,
      limit: -1,
      remaining: -1,
    };
  }

  const allowed = fileSize <= maxFileSize;

  return {
    allowed,
    current: fileSize,
    limit: maxFileSize,
    remaining: Math.max(0, maxFileSize - fileSize),
    reason: !allowed
      ? `File size exceeds limit (${(fileSize / (1024 * 1024)).toFixed(2)}MB / ${(maxFileSize / (1024 * 1024)).toFixed(
          2
        )}MB)`
      : undefined,
  };
}

/**
 * Check concurrent processing quota
 * @param userId - User ID
 * @param tier - Subscription tier
 * @returns Quota check result
 */
export async function checkConcurrentProcessingQuota(
  userId: string,
  tier: SubscriptionTier = 'free'
): Promise<QuotaCheckResult> {
  const limits = getTierLimits(tier);
  const maxConcurrent = limits.maxConcurrentProcessing;

  // Unlimited
  if (maxConcurrent === -1) {
    return {
      allowed: true,
      current: 0,
      limit: -1,
      remaining: -1,
    };
  }

  try {
    const result = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(documents)
      .where(and(eq(documents.userId, userId), eq(documents.status, 'processing')));

    const current = result[0]?.count ? Number(result[0].count) : 0;
    const remaining = Math.max(0, maxConcurrent - current);
    const allowed = current < maxConcurrent;

    return {
      allowed,
      current,
      limit: maxConcurrent,
      remaining,
      reason: !allowed ? `Concurrent processing limit reached (${current}/${maxConcurrent})` : undefined,
    };
  } catch (error) {
    console.error('Concurrent processing quota check error:', error);
    // Fail open - allow the request
    return {
      allowed: true,
      current: 0,
      limit: maxConcurrent,
      remaining: maxConcurrent,
    };
  }
}

/**
 * Check all quotas for document upload
 * @param userId - User ID
 * @param tier - Subscription tier
 * @param fileSize - File size in bytes
 * @returns Combined quota check result
 */
export async function checkUploadQuotas(
  userId: string,
  tier: SubscriptionTier = 'free',
  fileSize: number
): Promise<{
  allowed: boolean;
  reasons: string[];
  documentQuota: QuotaCheckResult;
  storageQuota: QuotaCheckResult;
  fileSizeQuota: QuotaCheckResult;
  concurrentQuota: QuotaCheckResult;
}> {
  const [documentQuota, storageQuota, fileSizeQuota, concurrentQuota] = await Promise.all([
    checkDocumentQuota(userId, tier),
    checkStorageQuota(userId, tier),
    Promise.resolve(checkFileSizeQuota(fileSize, tier)),
    checkConcurrentProcessingQuota(userId, tier),
  ]);

  const reasons: string[] = [];
  if (!documentQuota.allowed) reasons.push(documentQuota.reason || 'Document quota exceeded');
  if (!storageQuota.allowed) reasons.push(storageQuota.reason || 'Storage quota exceeded');
  if (!fileSizeQuota.allowed) reasons.push(fileSizeQuota.reason || 'File size quota exceeded');
  if (!concurrentQuota.allowed) reasons.push(concurrentQuota.reason || 'Concurrent processing quota exceeded');

  const allowed = documentQuota.allowed && storageQuota.allowed && fileSizeQuota.allowed && concurrentQuota.allowed;

  return {
    allowed,
    reasons,
    documentQuota,
    storageQuota,
    fileSizeQuota,
    concurrentQuota,
  };
}

/**
 * Get user quota summary
 * @param userId - User ID
 * @param tier - Subscription tier
 * @returns Quota summary
 */
export async function getQuotaSummary(
  userId: string,
  tier: SubscriptionTier = 'free'
): Promise<{
  documents: QuotaCheckResult;
  storage: QuotaCheckResult;
  concurrentProcessing: QuotaCheckResult;
  tier: SubscriptionTier;
  limits: ReturnType<typeof getTierLimits>;
}> {
  const [documents, storage, concurrentProcessing] = await Promise.all([
    checkDocumentQuota(userId, tier),
    checkStorageQuota(userId, tier),
    checkConcurrentProcessingQuota(userId, tier),
  ]);

  return {
    documents,
    storage,
    concurrentProcessing,
    tier,
    limits: getTierLimits(tier),
  };
}
