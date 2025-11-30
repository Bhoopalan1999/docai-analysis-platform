import { db } from '@/lib/db';
import { usage } from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * Cost per token estimates (in cents)
 * These are approximate costs based on current pricing (as of 2025)
 */
const COST_PER_TOKEN = {
  openai: {
    input: 0.01, // $0.01 per 1K tokens input (GPT-4 Turbo)
    output: 0.03, // $0.03 per 1K tokens output
  },
  anthropic: {
    input: 0.003, // $0.003 per 1K tokens input (Claude 3.5 Sonnet)
    output: 0.015, // $0.015 per 1K tokens output
  },
  gemini: {
    input: 0.0005, // $0.0005 per 1K tokens input (Gemini Pro)
    output: 0.0015, // $0.0015 per 1K tokens output
  },
  embedding: {
    openai: 0.0001, // $0.0001 per 1K tokens (text-embedding-3-large)
  },
};

/**
 * Track API usage and cost
 * @param userId - User ID
 * @param action - Action type (upload, query, process, etc.)
 * @param metadata - Additional metadata including model, tokens, etc.
 */
export async function trackUsage(
  userId: string,
  action: string,
  metadata?: {
    documentId?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    embeddingTokens?: number;
    [key: string]: unknown;
  }
): Promise<void> {
  try {
    let cost = 0;

    // Calculate cost based on action and model
    if (metadata?.model && metadata?.inputTokens && metadata?.outputTokens) {
      const model = metadata.model as keyof typeof COST_PER_TOKEN;
      if (COST_PER_TOKEN[model]) {
        const inputCost = ((metadata.inputTokens as number) / 1000) * COST_PER_TOKEN[model].input;
        const outputCost = ((metadata.outputTokens as number) / 1000) * COST_PER_TOKEN[model].output;
        cost = Math.round((inputCost + outputCost) * 100); // Convert to cents
      }
    }

    // Calculate embedding cost
    if (metadata?.embeddingTokens) {
      const embeddingCost = ((metadata.embeddingTokens as number) / 1000) * COST_PER_TOKEN.embedding.openai;
      cost += Math.round(embeddingCost * 100); // Convert to cents
    }

    // Insert usage record
    await db.insert(usage).values({
      userId,
      documentId: metadata?.documentId,
      action,
      cost,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error('Failed to track usage:', error);
    // Don't throw - usage tracking shouldn't break the main flow
  }
}

/**
 * Get total cost for a user
 * @param userId - User ID
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Total cost in cents
 */
export async function getTotalCost(userId: string, startDate?: Date, endDate?: Date): Promise<number> {
  try {
    const conditions = [eq(usage.userId, userId)];
    if (startDate) {
      conditions.push(gte(usage.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(usage.createdAt, endDate));
    }

    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
      })
      .from(usage)
      .where(and(...conditions));

    return result[0]?.total ? Number(result[0].total) : 0;
  } catch (error) {
    console.error('Failed to get total cost:', error);
    return 0;
  }
}

/**
 * Get cost breakdown by action type
 * @param userId - User ID
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Cost breakdown by action
 */
export async function getCostBreakdown(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Array<{ action: string; cost: number; count: number }>> {
  try {
    let conditions = [eq(usage.userId, userId)];

    if (startDate) {
      conditions.push(gte(usage.createdAt, startDate));
    }

    if (endDate) {
      conditions.push(lte(usage.createdAt, endDate));
    }

    const result = await db
      .select({
        action: usage.action,
        cost: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(usage)
      .where(and(...conditions))
      .groupBy(usage.action);

    return result.map((r) => ({
      action: r.action,
      cost: r.cost ? Number(r.cost) : 0,
      count: Number(r.count),
    }));
  } catch (error) {
    console.error('Failed to get cost breakdown:', error);
    return [];
  }
}

/**
 * Get cost for a specific document
 * @param userId - User ID
 * @param documentId - Document ID
 * @returns Total cost for the document in cents
 */
export async function getDocumentCost(userId: string, documentId: string): Promise<number> {
  try {
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${usage.cost}), 0)`,
      })
      .from(usage)
      .where(and(eq(usage.userId, userId), eq(usage.documentId, documentId)));

    return result[0]?.total ? Number(result[0].total) : 0;
  } catch (error) {
    console.error('Failed to get document cost:', error);
    return 0;
  }
}

/**
 * Get usage statistics
 * @param userId - User ID
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Usage statistics
 */
export async function getUsageStats(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCost: number;
  totalActions: number;
  costByAction: Array<{ action: string; cost: number; count: number }>;
  costByModel?: Array<{ model: string; cost: number; count: number }>;
}> {
  try {
    let conditions = [eq(usage.userId, userId)];

    if (startDate) {
      conditions.push(gte(usage.createdAt, startDate));
    }

    if (endDate) {
      conditions.push(lte(usage.createdAt, endDate));
    }

    const allUsage = await db
      .select()
      .from(usage)
      .where(and(...conditions));

    const totalCost = allUsage.reduce((sum, u) => sum + (Number(u.cost) || 0), 0);
    const totalActions = allUsage.length;

    // Cost by action
    const costByActionMap = new Map<string, { cost: number; count: number }>();
    for (const u of allUsage) {
      const existing = costByActionMap.get(u.action) || { cost: 0, count: 0 };
      costByActionMap.set(u.action, {
        cost: existing.cost + (Number(u.cost) || 0),
        count: existing.count + 1,
      });
    }

    const costByAction = Array.from(costByActionMap.entries()).map(([action, data]) => ({
      action,
      ...data,
    }));

    // Cost by model (if available in metadata)
    const costByModelMap = new Map<string, { cost: number; count: number }>();
    for (const u of allUsage) {
      if (u.metadata && typeof u.metadata === 'object' && 'model' in u.metadata) {
        const model = String(u.metadata.model);
        const existing = costByModelMap.get(model) || { cost: 0, count: 0 };
        costByModelMap.set(model, {
          cost: existing.cost + (Number(u.cost) || 0),
          count: existing.count + 1,
        });
      }
    }

    const costByModel = Array.from(costByModelMap.entries()).map(([model, data]) => ({
      model,
      ...data,
    }));

    return {
      totalCost,
      totalActions,
      costByAction,
      costByModel: costByModel.length > 0 ? costByModel : undefined,
    };
  } catch (error) {
    console.error('Failed to get usage stats:', error);
    return {
      totalCost: 0,
      totalActions: 0,
      costByAction: [],
    };
  }
}
